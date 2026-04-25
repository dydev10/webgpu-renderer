import { Geometry } from './Geometry';

export class TriangleGeometry extends Geometry {
  buffer: GPUBuffer;
  vertexCount: number = 3;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    super();
    const vertices: Float32Array = new Float32Array([
      0.0,  0.0,  0.5,  0.5,  0.0,
      0.0, -0.5, -0.5,  0.0,  1.0,
      0.0,  0.5, -0.5,  1.0,  1.0,
    ]);

    this.buffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.buffer.getMappedRange()).set(vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 20,
      attributes: [
        { shaderLocation: 0, format: 'float32x3', offset: 0 },
        { shaderLocation: 1, format: 'float32x2', offset: 12 },
      ],
    };
  }
}
