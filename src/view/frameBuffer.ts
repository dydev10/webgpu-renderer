export class FrameBuffer {
  name: string;

  texture!: GPUTexture;
  view!: GPUTextureView;
  sampler!: GPUSampler;
  bindGroup!: GPUBindGroup;

  // Depth Testing objects
  depthStencilState!: GPUDepthStencilState;
  depthStencilBuffer!: GPUTexture;
  depthStencilView!: GPUTextureView;
  depthStencilAttachment: GPURenderPassDepthStencilAttachment | null;
 
  colorAttachments: GPURenderPassColorAttachment[];

  constructor(name: string) {
    this.name = name;
    this.depthStencilAttachment = null;
    this.colorAttachments = [];
  }
  
  async init(device: GPUDevice, canvas: HTMLCanvasElement, bindGroupLayout: GPUBindGroupLayout, format: GPUTextureFormat, depthEnabled: boolean) {
    const width = canvas.width;
    const height = canvas.height;


    const textureDescriptor: GPUTextureDescriptor = {
      size: {
        width: width,
        height: height,
      },
      mipLevelCount: 1,
      format: format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    };

    this.texture = device.createTexture(textureDescriptor);

    const viewDescriptor: GPUTextureViewDescriptor = {
      format: format,
      dimension: '2d',
      aspect: 'all',
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 1,
    };
    this.view = this.texture.createView(viewDescriptor);

    const samplerDescriptor: GPUSamplerDescriptor = {
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      maxAnisotropy: 1,
    };
    this.sampler = device.createSampler(samplerDescriptor);

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.view
        },
        {
          binding: 1,
          resource: this.sampler
        },
      ],
    });

    if (depthEnabled) {
      this.makeDepthBufferResources(device, canvas);
    }

    this.colorAttachments.push({
      view: this.view,
      // clearValue: { r: 0.5, g: 0.1, b: 0.25, a: 1.0 },
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
      loadOp: 'clear',
      storeOp: 'store',
    });
  }

  async makeDepthBufferResources(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.depthStencilState = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
    };

    const size: GPUExtent3D = {
      width: canvas.width,
      height: canvas.height,
      depthOrArrayLayers: 1,
    };
    const depthBufferDescriptor: GPUTextureDescriptor = {
      size: size,
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    };
    this.depthStencilBuffer = device.createTexture(depthBufferDescriptor);

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

  renderTo(commandEncoder: GPUCommandEncoder): GPURenderPassEncoder {
    // renderPass holds the draw commands allocated by command encoder
    const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: this.colorAttachments,
      depthStencilAttachment: this.depthStencilAttachment!,
    });

    return renderPass;
  }

  readFrom(renderPass: GPURenderPassEncoder, bindingIndex: number) {
    renderPass.setBindGroup(bindingIndex, this.bindGroup);
  }
}
