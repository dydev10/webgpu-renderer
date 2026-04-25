import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import { Geometry } from './Geometry';
import type { MeshLoadOptions } from '../types/public';

export class ObjGeometry extends Geometry {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertexCount: number;

  private v: vec3[];
  private vt: vec2[];
  private vn: vec3[];
  private vertices: Float32Array;
  private attributes: GPUVertexAttribute[];

  private constructor() {
    super();
    this.v = [];
    this.vt = [];
    this.vn = [];
    this.attributes = [];
    this.buffer = null!;
    this.bufferLayout = null!;
    this.vertices = null!;
    this.vertexCount = 0;
  }

  static async load(device: GPUDevice, url: string, options?: MeshLoadOptions): Promise<ObjGeometry> {
    const geo = new ObjGeometry();
    const vtEnabled = options?.texCoords ?? true;
    const vnEnabled = options?.normals ?? false;
    const preTransform = options?.preTransform
      ? new Float32Array(options.preTransform) as unknown as mat4
      : mat4.create();

    await geo.readFile(url, vtEnabled, vnEnabled, preTransform);

    let floatsPerVertex = 0;
    let attributesPerVertex = 0;

    // positions always included
    geo.attributes.push({ shaderLocation: attributesPerVertex, format: 'float32x3', offset: floatsPerVertex * 4 });
    attributesPerVertex += 1;
    floatsPerVertex += 3;

    if (vtEnabled) {
      geo.attributes.push({ shaderLocation: attributesPerVertex, format: 'float32x2', offset: floatsPerVertex * 4 });
      attributesPerVertex += 1;
      floatsPerVertex += 2;
    }

    if (vnEnabled) {
      geo.attributes.push({ shaderLocation: attributesPerVertex, format: 'float32x3', offset: floatsPerVertex * 4 });
      attributesPerVertex += 1;
      floatsPerVertex += 3;
    }

    geo.vertexCount = geo.vertices.length / floatsPerVertex;

    geo.buffer = device.createBuffer({
      size: geo.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(geo.buffer.getMappedRange()).set(geo.vertices);
    geo.buffer.unmap();

    geo.bufferLayout = {
      arrayStride: floatsPerVertex * 4,
      attributes: geo.attributes,
    };

    return geo;
  }

  private async readFile(url: string, vtEnabled: boolean, vnEnabled: boolean, preTransform: mat4) {
    const result: number[] = [];
    const res = await fetch(url);
    const blob = await res.blob();
    const fileContent = await blob.text();
    const lines = fileContent.split('\n');

    lines.forEach((line: string) => {
      if (line[0] === 'v' && line[1] === ' ') {
        this.readVertexLine(line, preTransform);
      } else if (line[0] === 'v' && line[1] === 't') {
        this.readTexCoordLine(line);
      } else if (line[0] === 'v' && line[1] === 'n') {
        this.readNormalLine(line, preTransform);
      } else if (line[0] === 'f' && line[1] === ' ') {
        this.readFaceLine(line, result, vtEnabled, vnEnabled);
      }
    });

    this.vertices = new Float32Array(result);
  }

  private readVertexLine(line: string, preTransform: mat4) {
    const component = line.split(' ');
    const newVertex: vec4 = [
      Number(component[1]),
      Number(component[2]),
      Number(component[3]),
      1.0,
    ];
    const v = vec4.transformMat4(vec4.create(), newVertex, preTransform);
    this.v.push([v[0], v[1], v[2]]);
  }

  private readTexCoordLine(line: string) {
    const component = line.split(' ');
    this.vt.push([Number(component[1]), Number(component[2])]);
  }

  private readNormalLine(line: string, preTransform: mat4) {
    const component = line.split(' ');
    const newNormal: vec4 = [
      Number(component[1]),
      Number(component[2]),
      Number(component[3]),
      0.0,
    ];
    let v = vec4.transformMat4(vec4.create(), newNormal, preTransform);
    v = vec4.normalize(v, v);
    this.vn.push([v[0], v[1], v[2]]);
  }

  private readFaceLine(line: string, result: number[], vtEnabled: boolean, vnEnabled: boolean) {
    line.replace('\n', '');
    const vertexDescription = line.split(' ');
    const triangleCount = vertexDescription.length - 3;

    for (let i = 0; i < triangleCount; i++) {
      this.readCorner(vertexDescription[1], result, vtEnabled, vnEnabled);
      this.readCorner(vertexDescription[2 + i], result, vtEnabled, vnEnabled);
      this.readCorner(vertexDescription[3 + i], result, vtEnabled, vnEnabled);
    }
  }

  private readCorner(vertexDescription: string, result: number[], vtEnabled: boolean, vnEnabled: boolean) {
    const v_vt_vn = vertexDescription.split('/');
    const v  = this.v[Number(v_vt_vn[0]) - 1];
    const vt = this.vt[Number(v_vt_vn[1]) - 1];
    const vn = this.vn[Number(v_vt_vn[2]) - 1];

    result.push(v[0], v[1], v[2]);

    if (vtEnabled) {
      result.push(vt[0], vt[1]);
    }

    if (vnEnabled) {
      result.push(vn[0], vn[1], vn[2]);
    }
  }
}
