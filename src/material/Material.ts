export class Material {
  readonly kind = 'texture' as const;
  readonly bindGroup: GPUBindGroup;
  private readonly texture: GPUTexture;

  private constructor(texture: GPUTexture, bindGroup: GPUBindGroup) {
    this.texture = texture;
    this.bindGroup = bindGroup;
  }

  static async fromURL(device: GPUDevice, url: string): Promise<Material> {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    return Material.fromBitmap(device, bitmap);
  }

  static async fromBitmap(device: GPUDevice, bitmap: ImageBitmap): Promise<Material> {
    const texture = device.createTexture({
      size: { width: bitmap.width, height: bitmap.height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      { width: bitmap.width, height: bitmap.height },
    );

    const view = texture.createView({
      format: 'rgba8unorm',
      dimension: '2d',
      aspect: 'all',
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 1,
    });

    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      maxAnisotropy: 1,
    });

    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    const bindGroup = device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: view },
        { binding: 1, resource: sampler },
      ],
    });

    return new Material(texture, bindGroup);
  }

  destroy(): void {
    this.texture.destroy();
  }
}
