import { vec2, vec3 } from "gl-matrix";

export class ObjMesh {
  buffer!: GPUBuffer;
  bufferLayout!: GPUVertexBufferLayout;
  v: vec3[];
  vt: vec2[];
  vn: vec3[];
  vertices!: Float32Array;
  vertexCount!: number;

  constructor() {
    this.v = [];
    this.vt = [];
    this.vn = [];

  }

  async initialize(device: GPUDevice, url: string) {
    // x y r u v
    await this.readFile(url);
    this.vertexCount = this.vertices.length / 5;

    const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

    const descriptor: GPUBufferDescriptor = {
      size: this.vertices.byteLength,
      usage: usage,
      mappedAtCreation: true,
    };

    this.buffer = device.createBuffer(descriptor);

    new Float32Array(this.buffer.getMappedRange()).set(this.vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 20,
      attributes: [
        {
          shaderLocation: 0,
          format: 'float32x3',
          offset: 0,
        },
        {
          shaderLocation: 1,
          format: 'float32x2',
          offset: 12,
        },
      ], 
    };
  }

  async readFile(url: string) {
    const result: number[] = []; 

    // Fetch OBJ model
    const res: Response = await fetch(url);
    const blob: Blob = await res.blob();
    const fileContent: string = await blob.text();
    const lines = fileContent.split('\n');

    lines.forEach((line: string) => {
      if(line[0] === 'v' && line[1] === ' ') {
        this.readVertexLine(line);
      }
      else if(line[0] === 'v' && line[1] === 't') {
        this.readTexCoordLine(line);
      }
      else if(line[0] === 'v' && line[1] === 'n') {
        this.readNormalLine(line);
      }
      else if(line[0] === 'f' && line[1] === ' ') {
        this.readFaceLine(line, result);
      }
    });

    this.vertices = new Float32Array(result);
  }

  readVertexLine(line: string) {
    // ['v', x, y, z]
    const component = line.split(' ');
    const newVertex: vec3 = [
      Number(component[1]).valueOf(),
      Number(component[2]).valueOf(),
      Number(component[3]).valueOf(),
    ];

    this.v.push(newVertex);
  }

  readTexCoordLine(line: string) {
    // ['vt', u, v]
    const component = line.split(' ');
    const newTexCoord: vec2 = [
      Number(component[1]).valueOf(),
      Number(component[2]).valueOf(),
    ];

    this.vt.push(newTexCoord);
  }

  readNormalLine(line: string) {
    // ['vn', nx, ny, nz]
    const component = line.split(' ');
    const newNormal: vec3 = [
      Number(component[1]).valueOf(),
      Number(component[2]).valueOf(),
      Number(component[3]).valueOf(),
    ];

    this.vn.push(newNormal);
  }

  readFaceLine(line: string, result: number[]) {
    line.replace('\n', '');
    // ['f', v1, v2, ..]
    const vertexDescription = line.split(' ');

    const triangleCount = vertexDescription.length - 3;

    for (let i = 0; i < triangleCount; i++) {
      this.readCorner(vertexDescription[1], result);
      this.readCorner(vertexDescription[2 + i], result);
      this.readCorner(vertexDescription[3 + i], result);
    }
  }

  readCorner(vertexDescription: string, result: number[]) {
    const v_vt_vn = vertexDescription.split('/');
    const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
    const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
    // const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1];
  
    result.push(v[0]);
    result.push(v[1]);
    result.push(v[2]);
    result.push(vt[0]);
    result.push(vt[1]);
  }
}
