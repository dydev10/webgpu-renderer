import { Camera } from "../model/camera";
import { Triangle } from "../model/triangle";
import { Material } from "./material";
import shader from "./shaders/shaders.wgsl?raw";
import { TriangleMesh } from "./triangleMesh";
import { mat4 } from "gl-matrix";
export class Renderer {
  canvas: HTMLCanvasElement;
  
  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  // Assets
  triangleMesh!: TriangleMesh;
  material!: Material;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async Initialize() {
    await this.setupDevice();
    await this.createAssets();
    await this.makePipeline();
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

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.material = new Material();

    await this.material.init(this.device, '/img/synth.jpg');
  }

  async makePipeline() {
    /**
     * Bind Group
     */
    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer
          }
        },
        {
          binding: 1,
          resource: this.material.view
        },
        {
          binding: 2,
          resource: this.material.sampler
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    /**
     * Pipeline
     */
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
    });
  }

  async render(camera: Camera, triangles: Triangle[]) {
    /**
     * Model View Projection matrices
     */
    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800 / 600, 0.1, 10);

    const view = camera.getView();

    // const model = mat4.create();
    // mat4.rotate(model, model, 0.1, [0, 0, 1]);

    this.device.queue.writeBuffer(this.uniformBuffer, 64, view as ArrayBuffer);
    this.device.queue.writeBuffer(this.uniformBuffer, 128, projection as ArrayBuffer);

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
    });

    // Draw
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, this.triangleMesh.buffer);

    triangles.forEach((triangle) => {
      const model = triangle.getModel();
  
      this.device.queue.writeBuffer(this.uniformBuffer, 0, model as ArrayBuffer);
    
      renderPass.draw(3, 1, 0, 0);
      renderPass.end();
    });

   
    
    // Submit command buffer
    this.device.queue.submit([commandEncoder.finish()]);

    // Run render loop
    // requestAnimationFrame(this.render);
  }
}
