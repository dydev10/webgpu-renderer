import { worldShader   } from './shaders/world';
import { skyShader     } from './shaders/sky';
import { postShader    } from './shaders/post';
import { overlayShader } from './shaders/overlay';
import { Scene }            from '../scene/Scene';
import { StarterScene }     from '../scene/StarterScene';
import { ResourceRegistry } from '../registry/ResourceRegistry';
import { FrameBuffer }      from './FrameBuffer';
import type { InternalRenderData } from '../types/internal';
import type { RendererConfig }     from '../types/public';

const WORLD_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: 20,
  attributes: [
    { shaderLocation: 0, format: 'float32x3', offset: 0  },
    { shaderLocation: 1, format: 'float32x2', offset: 12 },
  ],
};

const OVERLAY_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: 32,
  attributes: [
    { shaderLocation: 0, format: 'float32x3', offset: 0  },
    { shaderLocation: 1, format: 'float32x2', offset: 12 },
    { shaderLocation: 2, format: 'float32x3', offset: 20 },
  ],
};

export class WebGPURenderer {
  readonly canvas: HTMLCanvasElement;
  readonly registry: ResourceRegistry;
  device!: GPUDevice;

  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private scene: Scene;

  private worldFrameLayout!: GPUBindGroupLayout;
  private skyLayout!: GPUBindGroupLayout;
  private overlayLayout!: GPUBindGroupLayout;
  private materialLayout!: GPUBindGroupLayout;

  private worldPipeline!: GPURenderPipeline;
  private skyPipeline!: GPURenderPipeline;
  private postPipeline!: GPURenderPipeline;
  private overlayPipeline!: GPURenderPipeline;

  private uniformBuffer!: GPUBuffer;
  private objectBuffer!: GPUBuffer;
  private parameterBuffer!: GPUBuffer;

  private worldFrameBuffer!: FrameBuffer;
  private overlayFrameBuffer!: FrameBuffer;

  private worldFrameBindGroup!: GPUBindGroup;
  private skyBindGroup!: GPUBindGroup;
  private overlayBindGroup!: GPUBindGroup;

  private running = false;
  private rafId = 0;
  private lastT = 0;

  constructor(canvas: HTMLCanvasElement, config?: RendererConfig) {
    this.canvas = canvas;
    this.registry = new ResourceRegistry();
    this.scene = (config?.scene as Scene | null | undefined) ?? new StarterScene();
  }

  async initialize(): Promise<void> {
    await this.setupDevice();
    this.makeLayouts();
    this.makeBuffers();
    await this.makeFrameBuffers();
    this.makePipelines();
    this.makeBindGroups();
    await this.scene.onAttach(this);
    this.makeSkyBindGroup();
  }

  start(): void {
    this.running = true;
    this.lastT = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  renderFrame(dt?: number): void {
    this.scene.update(dt);
    const aspect = this.canvas.width / this.canvas.height;
    const renderData = this.scene.buildRenderData(aspect);
    this.writeBuffers(renderData);
    const encoder = this.device.createCommandEncoder();
    this.drawWorld(encoder, renderData);
    this.drawOverlay(encoder, renderData);
    this.composite(encoder);
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.stop();
    this.scene.onDetach();
  }

  private loop = (t: number) => {
    if (!this.running) return;
    const dt = t - this.lastT;
    this.lastT = t;
    this.renderFrame(dt);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private async setupDevice() {
    const adapter = await navigator.gpu?.requestAdapter() as GPUAdapter;
    this.device = await adapter?.requestDevice() as GPUDevice;
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = 'bgra8unorm';
    this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
  }

  private makeLayouts() {
    this.worldFrameLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.skyLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX,   buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: 'cube' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.overlayLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      ],
    });

    this.materialLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });
  }

  private makeBuffers() {
    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.objectBuffer = this.device.createBuffer({
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.parameterBuffer = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private async makeFrameBuffers() {
    this.worldFrameBuffer = new FrameBuffer('World');
    await this.worldFrameBuffer.init(this.device, this.canvas, this.format, true);

    this.overlayFrameBuffer = new FrameBuffer('Overlay');
    await this.overlayFrameBuffer.init(this.device, this.canvas, this.format, true);
  }

  private makePipelines() {
    let layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.worldFrameLayout, this.materialLayout],
    });
    this.worldPipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module: this.device.createShaderModule({ code: worldShader }),
        entryPoint: 'vs_main',
        buffers: [WORLD_VERTEX_LAYOUT],
      },
      fragment: {
        module: this.device.createShaderModule({ code: worldShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: this.worldFrameBuffer.depthStencilState,
    });

    layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.skyLayout],
    });
    this.skyPipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module: this.device.createShaderModule({ code: skyShader }),
        entryPoint: 'sky_vert_main',
      },
      fragment: {
        module: this.device.createShaderModule({ code: skyShader }),
        entryPoint: 'sky_frag_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: this.worldFrameBuffer.depthStencilState,
    });

    layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.worldFrameBuffer.bindGroupLayout],
    });
    this.postPipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module: this.device.createShaderModule({ code: postShader }),
        entryPoint: 'vs_main',
      },
      fragment: {
        module: this.device.createShaderModule({ code: postShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.overlayLayout, this.materialLayout],
    });
    this.overlayPipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module: this.device.createShaderModule({ code: overlayShader }),
        entryPoint: 'vs_main',
        buffers: [OVERLAY_VERTEX_LAYOUT],
      },
      fragment: {
        module: this.device.createShaderModule({ code: overlayShader }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: this.overlayFrameBuffer.depthStencilState,
    });
  }

  private makeBindGroups() {
    this.worldFrameBindGroup = this.device.createBindGroup({
      layout: this.worldFrameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.objectBuffer  } },
      ],
    });

    this.overlayBindGroup = this.device.createBindGroup({
      layout: this.overlayLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  private makeSkyBindGroup() {
    const sky = this.scene.skybox;
    if (!sky) return;
    this.skyBindGroup = this.device.createBindGroup({
      layout: this.skyLayout,
      entries: [
        { binding: 0, resource: { buffer: this.parameterBuffer } },
        { binding: 1, resource: sky.view },
        { binding: 2, resource: sky.sampler },
      ],
    });
  }

  private writeBuffers(renderData: InternalRenderData) {
    this.device.queue.writeBuffer(this.uniformBuffer,   0,  renderData.viewMatrix);
    this.device.queue.writeBuffer(this.uniformBuffer,   64, renderData.projectionMatrix);
    this.device.queue.writeBuffer(this.objectBuffer,    0,  renderData.modelTransforms);
    this.device.queue.writeBuffer(this.parameterBuffer, 0,  renderData.skyParams, 0, 12);
  }

  private drawWorld(encoder: GPUCommandEncoder, renderData: InternalRenderData) {
    const pass = this.worldFrameBuffer.renderTo(encoder);

    if (this.skyBindGroup) {
      pass.setPipeline(this.skyPipeline);
      pass.setBindGroup(0, this.skyBindGroup);
      pass.draw(6);
    }

    pass.setPipeline(this.worldPipeline);
    pass.setBindGroup(0, this.worldFrameBindGroup);

    for (const call of renderData.worldCalls) {
      const geo = this.registry.getGeometry(call.geometryId);
      const mat = this.registry.getMaterial(call.materialId);
      if (!geo || !mat) continue;
      pass.setBindGroup(1, mat.bindGroup);
      pass.setVertexBuffer(0, geo.buffer);
      pass.draw(geo.vertexCount, call.instanceCount, 0, call.firstInstance);
    }

    pass.end();
  }

  private drawOverlay(encoder: GPUCommandEncoder, renderData: InternalRenderData) {
    const pass = this.overlayFrameBuffer.renderTo(encoder);

    pass.setPipeline(this.overlayPipeline);
    pass.setBindGroup(0, this.overlayBindGroup);

    for (const call of renderData.overlayCalls) {
      const geo = this.registry.getGeometry(call.geometryId);
      const mat = this.registry.getMaterial(call.materialId);
      if (!geo || !mat) continue;
      pass.setBindGroup(1, mat.bindGroup);
      pass.setVertexBuffer(0, geo.buffer);
      pass.draw(geo.vertexCount, call.instanceCount, 0, call.firstInstance);
    }

    pass.end();
  }

  private composite(encoder: GPUCommandEncoder) {
    const textureView = this.context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: textureView, loadOp: 'clear', storeOp: 'store' }],
    });

    pass.setPipeline(this.postPipeline);
    this.worldFrameBuffer.readFrom(pass, 0);
    pass.draw(6);
    this.overlayFrameBuffer.readFrom(pass, 0);
    pass.draw(6);

    pass.end();
  }
}
