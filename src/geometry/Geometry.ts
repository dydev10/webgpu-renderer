export abstract class Geometry {
  abstract buffer: GPUBuffer;
  abstract vertexCount: number;
  abstract bufferLayout: GPUVertexBufferLayout;

  destroy(): void {
    this.buffer.destroy();
  }
}
