export class FrameBuffer {
  readonly name: string;

  texture!: GPUTexture;
  view!: GPUTextureView;
  sampler!: GPUSampler;
  bindGroup!: GPUBindGroup;
  bindGroupLayout!: GPUBindGroupLayout;

  depthStencilState!: GPUDepthStencilState;
  depthStencilBuffer!: GPUTexture;
  depthStencilView!: GPUTextureView;
  depthStencilAttachment: GPURenderPassDepthStencilAttachment | null = null;
  colorAttachments: GPURenderPassColorAttachment[] = [];

  constructor(name: string) {
    this.name = name;
  }

  async init(device: GPUDevice, canvas: HTMLCanvasElement, format: GPUTextureFormat, depthEnabled: boolean) {
    const { width, height } = canvas;

    this.texture = device.createTexture({
      size: { width, height },
      mipLevelCount: 1,
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.view = this.texture.createView({
      format, dimension: '2d', aspect: 'all',
      baseMipLevel: 0, mipLevelCount: 1, baseArrayLayer: 0, arrayLayerCount: 1,
    });

    this.sampler = device.createSampler({
      addressModeU: 'repeat', addressModeV: 'repeat',
      magFilter: 'linear', minFilter: 'nearest', mipmapFilter: 'nearest',
      maxAnisotropy: 1,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: this.view },
        { binding: 1, resource: this.sampler },
      ],
    });

    if (depthEnabled) this.makeDepthBufferResources(device, canvas);

    this.colorAttachments.push({
      view: this.view,
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
      loadOp: 'clear',
      storeOp: 'store',
    });
  }

  private makeDepthBufferResources(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.depthStencilState = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
    };

    this.depthStencilBuffer = device.createTexture({
      size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 },
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.depthStencilView = this.depthStencilBuffer.createView({
      format: 'depth24plus-stencil8', dimension: '2d', aspect: 'all',
    });

    this.depthStencilAttachment = {
      view: this.depthStencilView,
      depthClearValue: 1.0,
      depthLoadOp: 'clear', depthStoreOp: 'store',
      stencilLoadOp: 'clear', stencilStoreOp: 'discard',
    };
  }

  renderTo(encoder: GPUCommandEncoder): GPURenderPassEncoder {
    return encoder.beginRenderPass({
      colorAttachments: this.colorAttachments,
      depthStencilAttachment: this.depthStencilAttachment!,
    });
  }

  readFrom(pass: GPURenderPassEncoder, bindingIndex: number) {
    pass.setBindGroup(bindingIndex, this.bindGroup);
  }
}
