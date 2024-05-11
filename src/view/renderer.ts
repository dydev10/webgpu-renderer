import { mat4 } from "gl-matrix";
import shader from "./shaders/shaders.wgsl?raw";
import { Material } from "./material";
import { TriangleMesh } from "./triangleMesh";
import { QuadMesh } from "./quadMesh";
import { objectTypes, RenderData } from "../model/definitions";
import { ObjMesh } from "./objMesh";

export class Renderer {
  canvas: HTMLCanvasElement;
  
  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  bindGroupLayout!: GPUBindGroupLayout;
  pipeline!: GPURenderPipeline;
  frameGroupLayout!: GPUBindGroupLayout;
  materialGroupLayout!: GPUBindGroupLayout;
  frameBindGroup!: GPUBindGroup;

  // Depth Testing objects
  depthStencilState!: GPUDepthStencilState;
  depthStencilBuffer!: GPUTexture;
  depthStencilView!: GPUTextureView;
  depthStencilAttachment!: GPURenderPassDepthStencilAttachment;
  
  // Assets
  triangleMesh!: TriangleMesh;
  quadMesh!: QuadMesh;
  statueMesh!: ObjMesh;
  triangleMaterial!: Material;
  quadMaterial!: Material;
  objectBuffer!: GPUBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async Initialize() {
    await this.setupDevice();
    await this.makeBindGroupLayouts();
    await this.createAssets();
    await this.makeDepthBufferResources();
    await this.makePipeline();
    await this.makeBindGroup();
    // this.render();
  }

  async setupDevice() {
    this.adapter = await navigator.gpu?.requestAdapter() as GPUAdapter;
    this.device = await this.adapter?.requestDevice() as GPUDevice;
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = 'bgra8unorm';
    
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });
  }

  async makeBindGroupLayouts() {
    this.frameGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'read-only-storage',
            hasDynamicOffset: false,
          },
        },
      ],
    });

    this.materialGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
  }

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.quadMesh = new QuadMesh(this.device);
    this.triangleMaterial = new Material();
    this.quadMaterial = new Material();
    
    this.statueMesh = new ObjMesh();
    this.statueMesh.initialize(this.device, '/model/ground.obj');

    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const modelBufferDescriptor: GPUBufferDescriptor = {
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    };
    this.objectBuffer = this.device.createBuffer(modelBufferDescriptor);

    await this.triangleMaterial.init(this.device, '/img/synth.jpg', this.materialGroupLayout);
    await this.quadMaterial.init(this.device, '/img/floor.png', this.materialGroupLayout);  
  }

  async makeDepthBufferResources() {
    this.depthStencilState = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
    };

    const size: GPUExtent3D = {
      width: this.canvas.width,
      height: this.canvas.height,
      depthOrArrayLayers: 1,
    }
    const depthBufferDescriptor: GPUTextureDescriptor = {
      size: size,
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    };
    this.depthStencilBuffer = this.device.createTexture(depthBufferDescriptor);

    const depthViewDescriptor: GPUTextureViewDescriptor = {
      format: 'depth24plus-stencil8',
      dimension: '2d',
      aspect: 'all',
    };
    this.depthStencilView = this.depthStencilBuffer.createView(depthViewDescriptor);

    this.depthStencilAttachment = {
      view: this.depthStencilView,
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      stencilLoadOp: 'clear',
      stencilStoreOp: 'discard',
    }
  }

  async makePipeline() {
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.frameGroupLayout, this.materialGroupLayout]
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: shader,
        }),
        entryPoint: 'vs_main',
        buffers: [this.triangleMesh.bufferLayout,]
      },
      fragment: {
        module: this.device.createShaderModule({
          code: shader,
        }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
        }]
      },
      primitive: {
        topology: 'triangle-list',
      },
      layout: pipelineLayout,
      depthStencil: this.depthStencilState
    });
  }

  async makeBindGroup() {
    this.frameBindGroup = this.device.createBindGroup({
      layout: this.frameGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: this.objectBuffer
          }
        },
      ]
    })
  }

  async render(renderables: RenderData) {
    /**
     * Model View Projection matrices
     */
    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800 / 600, 0.1, 10);

    const view = renderables.viewTransform;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, view as ArrayBuffer);
    this.device.queue.writeBuffer(this.uniformBuffer, 64, projection as ArrayBuffer);
    this.device.queue.writeBuffer(this.objectBuffer, 0, renderables.modelTransforms, 0, renderables.modelTransforms.length);

    /**
     * Command Encoder
     */
    const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
    const textureView: GPUTextureView = this.context.getCurrentTexture().createView();
    const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.1, b: 0.25, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: this.depthStencilAttachment,
    });

    // Draw
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.frameBindGroup);
    
    let drawnObjectCount = 0;

    // Triangles
    renderPass.setBindGroup(1, this.triangleMaterial.bindGroup);
    renderPass.setVertexBuffer(0, this.triangleMesh.buffer);
    renderPass.draw(
      3,
      renderables.objectCounts[objectTypes.TRIANGLE],
      0,
      drawnObjectCount
    );
    drawnObjectCount += renderables.objectCounts[objectTypes.TRIANGLE];
    
    // Quads
    renderPass.setBindGroup(1, this.quadMaterial.bindGroup);
    renderPass.setVertexBuffer(0, this.quadMesh.buffer);
    renderPass.draw(
      6,
      renderables.objectCounts[objectTypes.QUAD],
      0,
      drawnObjectCount
    );
    drawnObjectCount += renderables.objectCounts[objectTypes.QUAD];


    // Statue
    renderPass.setBindGroup(1, this.triangleMaterial.bindGroup);
    renderPass.setVertexBuffer(0, this.statueMesh.buffer);
    renderPass.draw(
      this.statueMesh.vertexCount,
      1,
      0,
      drawnObjectCount
    );
    drawnObjectCount += 1;

    renderPass.end();
  
    // Submit command buffer
    this.device.queue.submit([commandEncoder.finish()]);
  }
}
