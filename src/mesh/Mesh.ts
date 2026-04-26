import { mat4 } from 'gl-matrix';
import type { Geometry } from '../geometry/Geometry';
import type { AnyMaterial } from '../types/public';

export type RenderLayer = 'world' | 'overlay';

export class Mesh {
  readonly geometry: Geometry | null;
  readonly material: AnyMaterial;
  readonly transform: mat4;
  readonly layer: RenderLayer;

  constructor(geometry: Geometry | null, material: AnyMaterial, layer: RenderLayer = 'world') {
    this.geometry = geometry;
    this.material = material;
    this.transform = mat4.create();
    this.layer = layer;
  }
}
