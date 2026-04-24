import { vec2, vec3, vec4, mat4 } from "gl-matrix";

export class ObjMesh {
  buffer!: GPUBuffer;
  bufferLayout!: GPUVertexBufferLayout;
  v: vec3[];
  vt: vec2[];
  vn: vec3[];
  vertices!: Float32Array;
  vertexCount!: number;
  attributes: GPUVertexAttribute[];

  constructor() {
    this.v = [];
    this.vt = [];
    this.vn = [];

    this.attributes = [];
  }

  async initialize(device: GPUDevice, url: string, vEnabled: boolean, vtEnabled: boolean, vnEnabled: boolean, preTransform: mat4) {
    // x y z u v nx ny nz
    await this.readFile(url, vEnabled, vtEnabled, vnEnabled, preTransform);

    let floatsPerVertex = 0;
    let attributesPerVertex = 0;

    if (vEnabled) {
      this.attributes.push({
        shaderLocation: attributesPerVertex,
        format: 'float32x3',
        offset: floatsPerVertex * 4,
      });
      attributesPerVertex += 1;
      floatsPerVertex += 3;
    }

    if (vtEnabled) {
      this.attributes.push({
        shaderLocation: attributesPerVertex,
        format: 'float32x2',
        offset: floatsPerVertex * 4,
      });
      attributesPerVertex += 1;
      floatsPerVertex += 2;
    }

    if (vnEnabled) {
      this.attributes.push({
        shaderLocation: attributesPerVertex,
        format: 'float32x3',
        offset: floatsPerVertex * 4,
      });
      attributesPerVertex += 1;
      floatsPerVertex += 3;
    }

    this.vertexCount = this.vertices.length / floatsPerVertex;

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
      arrayStride: floatsPerVertex * 4,
      attributes: this.attributes, 
    };
  }

  async readFile(url: string, vEnabled: boolean, vtEnabled: boolean, vnEnabled: boolean, preTransform: mat4) {
    const result: number[] = []; 

    // Fetch OBJ model
    const res: Response = await fetch(url);
    const blob: Blob = await res.blob();
    const fileContent: string = await blob.text();
    const lines = fileContent.split('\n');

    lines.forEach((line: string) => {
      if(line[0] === 'v' && line[1] === ' ') {
        this.readVertexLine(line, preTransform);
      }
      else if(line[0] === 'v' && line[1] === 't') {
        this.readTexCoordLine(line);
      }
      else if(line[0] === 'v' && line[1] === 'n') {
        this.readNormalLine(line, preTransform);
      }
      else if(line[0] === 'f' && line[1] === ' ') {
        this.readFaceLine(line, result, vEnabled, vtEnabled, vnEnabled);
      }
    });

    this.vertices = new Float32Array(result);
  }

  readVertexLine(line: string, preTransform: mat4) {
    // ['v', x, y, z]
    const component = line.split(' ');
    const newVertex: vec4 = [
      Number(component[1]).valueOf(),
      Number(component[2]).valueOf(),
      Number(component[3]).valueOf(),
      1.0,
    ];

    let v = vec4.create();
    v = vec4.transformMat4(v, newVertex, preTransform);

    this.v.push([v[0], v[1], v[2]]);
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

  readNormalLine(line: string, preTransform: mat4) {
    // ['vn', nx, ny, nz]
    const component = line.split(' ');
    const newNormal: vec4 = [
      Number(component[1]).valueOf(),
      Number(component[2]).valueOf(),
      Number(component[3]).valueOf(),
      0.0,
    ];

    let v = vec4.create();
    v = vec4.transformMat4(v, newNormal, preTransform);
    v = vec4.normalize(v, v);

    this.vn.push([v[0], v[1], v[2]]);
  }

  readFaceLine(line: string, result: number[], vEnabled: boolean, vtEnabled: boolean, vnEnabled: boolean) {
    line.replace('\n', '');
    // ['f', v1, v2, ..]
    const vertexDescription = line.split(' ');

    const triangleCount = vertexDescription.length - 3;

    for (let i = 0; i < triangleCount; i++) {
      this.readCorner(vertexDescription[1], result, vEnabled, vtEnabled, vnEnabled);
      this.readCorner(vertexDescription[2 + i], result, vEnabled, vtEnabled, vnEnabled);
      this.readCorner(vertexDescription[3 + i], result, vEnabled, vtEnabled, vnEnabled);
    }
  }

  readCorner(vertexDescription: string, result: number[], vEnabled: boolean, vtEnabled: boolean, vnEnabled: boolean) {
    const v_vt_vn = vertexDescription.split('/');
    const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
    const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
    const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1];
  

    if (vEnabled) {
      result.push(v[0]);
      result.push(v[1]);
      result.push(v[2]);
    }

    if (vtEnabled) {
      result.push(vt[0]);
      result.push(vt[1]);
    }

    if (vnEnabled) {
      result.push(vn[0]);
      result.push(vn[1]);
      result.push(vn[2]);
    }
  }
}
