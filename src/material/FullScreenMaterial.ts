const VERTEX_SHADER = /* wgsl */`
@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  );
  return vec4<f32>(pos[idx], 0.0, 1.0);
}
`;

const UNIFORM_PREAMBLE = /* wgsl */`
struct ShaderUniforms { time: f32, _pad: f32, resolution: vec2<f32> }
@group(0) @binding(0) var<uniform> u: ShaderUniforms;
`;

export class FullScreenMaterial {
  static readonly wgslUniforms: string = UNIFORM_PREAMBLE;

  readonly kind = 'fullscreen' as const;
  readonly bindGroup: GPUBindGroup;
  readonly pipeline: GPURenderPipeline;

  private readonly device: GPUDevice;
  private readonly uniformBuffer: GPUBuffer;
  private readonly uniformData = new Float32Array(4);

  private constructor(
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    bindGroup: GPUBindGroup,
    uniformBuffer: GPUBuffer,
  ) {
    this.device = device;
    this.pipeline = pipeline;
    this.bindGroup = bindGroup;
    this.uniformBuffer = uniformBuffer;
  }

  static create(device: GPUDevice, format: GPUTextureFormat, fragmentShader: string): FullScreenMaterial {
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const uniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: {
        module: device.createShaderModule({ code: VERTEX_SHADER }),
        entryPoint: 'vs_main',
      },
      fragment: {
        module: device.createShaderModule({ code: UNIFORM_PREAMBLE + '\n' + fragmentShader }),
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        format: 'depth24plus-stencil8',
        depthWriteEnabled: false,
        depthCompare: 'always',
      },
    });

    return new FullScreenMaterial(device, pipeline, bindGroup, uniformBuffer);
  }

  tick(elapsed: number, width: number, height: number): void {
    this.uniformData[0] = elapsed;
    this.uniformData[2] = width;
    this.uniformData[3] = height;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);
  }

  destroy(): void {
    this.uniformBuffer.destroy();
  }
}
