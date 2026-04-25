export abstract class Geometry {
  abstract buffer: GPUBuffer;
  abstract vertexCount: number;
  abstract bufferLayout: GPUVertexBufferLayout;
}
