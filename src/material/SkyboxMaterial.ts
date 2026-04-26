export class SkyboxMaterial {
  readonly view: GPUTextureView;
  readonly sampler: GPUSampler;
  private constructor(view: GPUTextureView, sampler: GPUSampler) {
    this.view = view;
    this.sampler = sampler;
  }

  static async fromURLs(
    device: GPUDevice,
    urls: [string, string, string, string, string, string]
  ): Promise<SkyboxMaterial> {
    const imageData: ImageBitmap[] = await Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return createImageBitmap(blob);
      })
    );

    const texture = device.createTexture({
      dimension: '2d',
      size: { width: imageData[0].width, height: imageData[0].height, depthOrArrayLayers: 6 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    for (let i = 0; i < 6; i++) {
      device.queue.copyExternalImageToTexture(
        { source: imageData[i] },
        { texture, origin: [0, 0, i] },
        [imageData[i].width, imageData[i].height]
      );
    }

    const view = texture.createView({
      format: 'rgba8unorm',
      dimension: 'cube',
      aspect: 'all',
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 6,
    });

    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      maxAnisotropy: 1,
    });

    return new SkyboxMaterial(view, sampler);
  }
}
