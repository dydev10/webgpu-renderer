import { mat4 } from 'gl-matrix';
import { Camera } from '../model/camera';
import { Scene } from './Scene';
import { Triangle } from './objects/Triangle';
import { Quad } from './objects/Quad';
import { Statue } from './objects/Statue';
import { objectTypes } from '../model/definitions';
import type { RenderData } from '../model/definitions';

export class StarterScene extends Scene {
  private triangles: Triangle[] = [];
  private quads: Quad[] = [];
  private statue!: Statue;
  triangleCount = 0;
  quadCount = 0;

  constructor() {
    super();
    this.camera = new Camera([-2, 0, 0.5], 0, 0);
    this.generateTriangles();
    this.generateQuads();
    this.statue = new Statue([0, 0, 0], [0, 0, 0]);
  }

  update(_dt?: number): void {
    this.triangles.forEach((tri, i) => {
      tri.update();
      this.updateObjectBufferFromModelMatrix(i, tri.getModel());
    });

    this.quads.forEach((quad, i) => {
      quad.update();
      this.updateObjectBufferFromModelMatrix(i + this.triangleCount, quad.getModel());
    });

    this.statue.update();
    this.updateObjectBufferFromModelMatrix(this.triangleCount + this.quadCount, this.statue.getModel());

    this.camera.update();
  }

  override getRenderables(): RenderData {
    return {
      viewTransform: this.camera.getViewMatrix(),
      modelTransforms: this.objectData,
      objectCounts: {
        [objectTypes.TRIANGLE]: this.triangleCount,
        [objectTypes.QUAD]: this.quadCount,
      },
    };
  }

  private generateTriangles(): void {
    for (let y = -5; y <= 5; y++) {
      this.triangles.push(new Triangle([2, y, 0], 0));
      this.updateObjectBufferFromModelMatrix(this.triangleCount, mat4.create());
      this.triangleCount++;
    }
  }

  private generateQuads(): void {
    let i = this.triangleCount;
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        this.quads.push(new Quad([x, y, 0]));
        this.updateObjectBufferFromModelMatrix(i, mat4.create());
        i++;
        this.quadCount++;
      }
    }
  }
}
