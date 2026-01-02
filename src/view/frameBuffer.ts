export class FrameBuffer {
  texture!: GPUTexture;
  view!: GPUTextureView;
  sampler!: GPUSampler;
  bindGroup!: GPUBindGroup;

  async init(device: GPUDevice, canvas: HTMLCanvasElement, bindGroupLayout: GPUBindGroupLayout, format: GPUTextureFormat) {
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
  }
}
