import { mat4 } from "gl-matrix";
import shader from "./shaders/shaders.wgsl?raw";
import skyShader from "./shaders/skyShader.wgsl?raw";
import postShader from "./shaders/post.wgsl?raw";
import { Material } from "./material";
import { TriangleMesh } from "./triangleMesh";
import { QuadMesh } from "./quadMesh";
import { objectTypes, pipelineTypes, RenderData } from "../model/definitions";
import { ObjMesh } from "./objMesh";
import { Camera } from "../model/camera";
import { CubeMapMaterial } from "./cubeMapMaterial";
import { FrameBuffer } from "./frameBuffer";

export class Renderer {
  canvas: HTMLCanvasElement;
  
  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  pipelines: {[pipeline in pipelineTypes]: GPURenderPipeline | null};
  frameGroupLayouts!: {[pipeline in pipelineTypes]: GPUBindGroupLayout | null};
  frameBindGroups!: {[pipeline in pipelineTypes]: GPUBindGroup | null};
  materialGroupLayout!: GPUBindGroupLayout;

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
  parameterBuffer!: GPUBuffer;
  skyMaterial!: CubeMapMaterial;
  frameBuffer!: FrameBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.pipelines = {
      [pipelineTypes.STANDARD]: null,
      [pipelineTypes.SKY] : null,
      [pipelineTypes.POST] : null,
    };

    this.frameGroupLayouts = {
      [pipelineTypes.STANDARD]: null,
      [pipelineTypes.SKY]: null,
      [pipelineTypes.POST] : null,
    };

    this.frameBindGroups = {
      [pipelineTypes.STANDARD]: null,
      [pipelineTypes.SKY]: null,
      [pipelineTypes.POST] : null,
    };
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
    this.frameGroupLayouts[pipelineTypes.STANDARD] = this.device.createBindGroupLayout({
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

    this.frameGroupLayouts[pipelineTypes.SKY] = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
           viewDimension: 'cube'
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });

    this.frameGroupLayouts[pipelineTypes.POST] = this.device.createBindGroupLayout({
      entries:[
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            viewDimension: '2d',
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
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
    this.skyMaterial = new CubeMapMaterial();
    this.frameBuffer = new FrameBuffer();
    
    this.statueMesh = new ObjMesh();
    this.statueMesh.initialize(this.device, '/model/ground.obj', true, true, false);

    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const modelBufferDescriptor: GPUBufferDescriptor = {
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    };
    this.objectBuffer = this.device.createBuffer(modelBufferDescriptor);
    
    const parameterBufferDescriptor: GPUBufferDescriptor = {
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    this.parameterBuffer = this.device.createBuffer(parameterBufferDescriptor);

    await this.triangleMaterial.init(this.device, '/img/synth.jpg', this.materialGroupLayout);
    await this.quadMaterial.init(this.device, '/img/floor.png', this.materialGroupLayout);  
  
    // sky assets
    const urls = [
      '/img/sky_back.png',    // x+
      '/img/sky_front.png',   // x-
      '/img/sky_left.png',    // y+
      '/img/sky_right.png',   // y-
      '/img/sky_top.png',     // z+
      '/img/sky_bottom.png',  // z-
    ];
    await this.skyMaterial.initialize(this.device, urls);

    await this.frameBuffer.init(this.device, this.canvas, this.frameGroupLayouts[pipelineTypes.POST]!, this.format);
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
    };
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
    };
  }

  async makePipeline() {
    let pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [
        this.frameGroupLayouts[pipelineTypes.STANDARD] as GPUBindGroupLayout,
        this.materialGroupLayout
      ]
    });

    this.pipelines[pipelineTypes.STANDARD] = this.device.createRenderPipeline({
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

    pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [
        this.frameGroupLayouts[pipelineTypes.SKY] as GPUBindGroupLayout
      ]
    });

    this.pipelines[pipelineTypes.SKY] = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: skyShader,
        }),
        entryPoint: 'sky_vert_main',
      },
      fragment: {
        module: this.device.createShaderModule({
          code: skyShader,
        }),
        entryPoint: 'sky_frag_main',
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

    pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [
        this.frameGroupLayouts[pipelineTypes.POST] as GPUBindGroupLayout,
      ]
    });

    this.pipelines[pipelineTypes.POST] = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: postShader,
        }),
        entryPoint: 'vs_main',
      },
      fragment: {
        module: this.device.createShaderModule({
          code: postShader,
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
    });

  }

  async makeBindGroup() {
    this.frameBindGroups[pipelineTypes.STANDARD] = this.device.createBindGroup({
      layout: this.frameGroupLayouts[pipelineTypes.STANDARD] as GPUBindGroupLayout,
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
    });

    this.frameBindGroups[pipelineTypes.SKY] = this.device.createBindGroup({
      layout: this.frameGroupLayouts[pipelineTypes.SKY] as GPUBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.parameterBuffer
          }
        },
        {
          binding: 1,
          resource: this.skyMaterial.view
        },
        {
          binding: 2,
          resource: this.skyMaterial.sampler
        },
      ]
    });
  }

  prepareScene(renderables: RenderData, camera: Camera) {
    /**
     * Model View Projection matrices
     */
    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800 / 600, 0.1, 10);

    const view = renderables.viewTransform;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, view as ArrayBuffer);
    this.device.queue.writeBuffer(this.uniformBuffer, 64, projection as ArrayBuffer);
    this.device.queue.writeBuffer(
      this.objectBuffer,
      0,
      renderables.modelTransforms,
      0,
      renderables.modelTransforms.length
    );

    const dy = Math.tan(Math.PI / 8);
    const dx = dy * (800 / 600);

    this.device.queue.writeBuffer(
      this.parameterBuffer,
      0,
      new Float32Array(
        [
          camera.forwards[0],
          camera.forwards[1],
          camera.forwards[2],
          0,
          dx * camera.right[0],
          dx * camera.right[1],
          dx * camera.right[2],
          0,
          dy * camera.up[0],
          dy * camera.up[1],
          dy * camera.up[2],
          0,
        ]
      ),
      0,
      12
    );
  }

  async render(renderables: RenderData, camera: Camera) {
    /**
     * Command Encoder
     */
    const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
    
    this.drawScene(renderables, camera, commandEncoder);

    this.applyPostProcessing(commandEncoder);

    // Submit command buffer
    this.device.queue.submit([commandEncoder.finish()]);
  }

  drawScene(renderables: RenderData, camera: Camera, commandEncoder: GPUCommandEncoder) {
    this.prepareScene(renderables, camera);

    // renderPass holds the draw commands allocated by command encoder
    const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.frameBuffer.view,
          // clearValue: { r: 0.5, g: 0.1, b: 0.25, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: this.depthStencilAttachment,
    });

    // draw sky first
    renderPass.setPipeline(this.pipelines[pipelineTypes.SKY] as GPURenderPipeline);
    renderPass.setBindGroup(0, this.frameBindGroups[pipelineTypes.SKY]);
    renderPass.setBindGroup(1, this.quadMaterial.bindGroup); // TODO: create bindGroup property in skyMaterial
    renderPass.draw(6, 1, 0, 0);

    // Draw
    renderPass.setPipeline(this.pipelines[pipelineTypes.STANDARD] as GPURenderPipeline);
    renderPass.setBindGroup(0, this.frameBindGroups[pipelineTypes.STANDARD]);
    
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
  }

  async applyPostProcessing(commandEncoder: GPUCommandEncoder) {
    const textureView: GPUTextureView = this.context.getCurrentTexture().createView();
    const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.pipelines[pipelineTypes.POST] as GPURenderPipeline);
    // renderPass.setBindGroup(0, this.frameBindGroups[pipelineTypes.POST]);
    renderPass.setBindGroup(0, this.frameBuffer.bindGroup);
    renderPass.draw(6, 1, 0, 0);  // TODO: check vertexCount passed here

    renderPass.end();
  }
}
