import type { ShaderMaterialOptions } from '../types/public';

// Group 0 layout mirrors the renderer's worldFrameLayout exactly so the renderer can
// bind its existing worldFrameBindGroup at slot 0 without any additional setup.
const GROUP0_LAYOUT_DESC: GPUBindGroupLayoutDescriptor = {
  entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
  ],
};

const WORLD_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: 20,
  attributes: [
    { shaderLocation: 0, format: 'float32x3', offset: 0  },
    { shaderLocation: 1, format: 'float32x2', offset: 12 },
  ],
};

const VERTEX_SHADER = /* wgsl */`
struct TransformData { view: mat4x4<f32>, projection: mat4x4<f32> }
struct ObjectData   { model: array<mat4x4<f32>> }

@binding(0) @group(0) var<uniform>          transformUBO: TransformData;
@binding(1) @group(0) var<storage, read>    objects:      ObjectData;

struct Fragment {
  @builtin(position) Position: vec4<f32>,
  @location(0)       TexCoord: vec2<f32>,
}

@vertex
fn vs_main(
  @builtin(instance_index) ID:             u32,
  @location(0)             vertexPosition: vec3<f32>,
  @location(1)             vertexTexCoord: vec2<f32>,
) -> Fragment {
  var out: Fragment;
  out.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPosition, 1.0);
  out.TexCoord = vertexTexCoord;
  return out;
}
`;

const UNIFORM_PREAMBLE = /* wgsl */`
struct ShaderUniforms { time: f32, _pad: f32, resolution: vec2<f32> }
@group(1) @binding(0) var<uniform> u: ShaderUniforms;
`;

export class MeshShaderMaterial {
  static readonly wgslUniforms: string = UNIFORM_PREAMBLE;

  readonly kind = 'mesh-shader' as const;
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

  static create(device: GPUDevice, format: GPUTextureFormat, fragmentShader: string, options?: ShaderMaterialOptions): MeshShaderMaterial {
    const group0Layout = device.createBindGroupLayout(GROUP0_LAYOUT_DESC);

    const group1Layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const uniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      layout: group1Layout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [group0Layout, group1Layout] }),
      vertex: {
        module: device.createShaderModule({ code: VERTEX_SHADER }),
        entryPoint: 'vs_main',
        buffers: [WORLD_VERTEX_LAYOUT],
      },
      fragment: {
        module: device.createShaderModule({ code: UNIFORM_PREAMBLE + '\n' + fragmentShader }),
        entryPoint: options?.fsEntry ?? 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: {
        format: 'depth24plus-stencil8',
        depthWriteEnabled: true,
        depthCompare: 'less-equal',
      },
    });

    return new MeshShaderMaterial(device, pipeline, bindGroup, uniformBuffer);
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
