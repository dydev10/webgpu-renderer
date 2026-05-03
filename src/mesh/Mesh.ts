import type { Geometry } from '../geometry/Geometry';
import type { AnyMaterial } from '../types/public';

export type RenderLayer = 'world' | 'overlay';

export class Mesh {
  readonly geometry: Geometry | null;
  readonly material: AnyMaterial;
  readonly layer: RenderLayer;

  position: [number, number, number] = [0, 0, 0];
  rotation: [number, number, number] = [0, 0, 0]; // degrees, XYZ euler order
  scale:    [number, number, number] = [1, 1, 1];

  constructor(geometry: Geometry | null, material: AnyMaterial, layer: RenderLayer = 'world') {
    this.geometry = geometry;
    this.material = material;
    this.layer    = layer;
  }

  setPosition(pos: [number, number, number]): this {
    this.position = pos;
    return this;
  }

  setRotation(rot: [number, number, number]): this {
    this.rotation = rot;
    return this;
  }

  setScale(s: [number, number, number] | number): this {
    this.scale = typeof s === 'number' ? [s, s, s] : s;
    return this;
  }

  setTransform(t: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?:    [number, number, number] | number;
  }): this {
    if (t.position !== undefined) this.position = t.position;
    if (t.rotation !== undefined) this.rotation = t.rotation;
    if (t.scale    !== undefined) this.scale    = typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale;
    return this;
  }
}
