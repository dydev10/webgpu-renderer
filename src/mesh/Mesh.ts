import { mat4 } from 'gl-matrix';
import type { Geometry } from '../geometry/Geometry';
import type { Material } from '../material/Material';

export type RenderLayer = 'world' | 'overlay';

export class Mesh {
  readonly geometry: Geometry;
  readonly material: Material;
  readonly transform: mat4;
  readonly layer: RenderLayer;

  constructor(geometry: Geometry, material: Material, layer: RenderLayer = 'world') {
    this.geometry = geometry;
    this.material = material;
    this.transform = mat4.create();
    this.layer = layer;
  }
}
