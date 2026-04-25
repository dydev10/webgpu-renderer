import { mat4 } from 'gl-matrix';
import { Camera } from '../model/camera';
import type { SkyboxMaterial } from '../material/SkyboxMaterial';
import type { Mesh } from '../mesh/Mesh';
import type { SceneConfig } from '../types/public';
import type { InternalRenderData } from '../types/internal';
import type { RenderData } from '../model/definitions';

export abstract class Scene {
  camera!: Camera;
  skybox?: SkyboxMaterial;
  protected objectData: Float32Array;
  protected meshEntries: { mesh: Mesh; slot: number }[] = [];
  private nextSlot = 0;

  constructor(config?: SceneConfig) {
    const buf = config?.sharedTransformBuffer
      ?? new ArrayBuffer((config?.maxObjects ?? 1024) * 64);
    this.objectData = new Float32Array(buf);
  }

  add(mesh: Mesh): Mesh {
    const slot = this.nextSlot++;
    this.meshEntries.push({ mesh, slot });
    return mesh;
  }

  remove(mesh: Mesh): void {
    this.meshEntries = this.meshEntries.filter(e => e.mesh !== mesh);
  }

  abstract update(dt?: number): void;

  onAttach(_renderer: unknown): Promise<void> {
    return Promise.resolve();
  }

  onDetach(): void {}

  getPlayer(): Camera {
    return this.camera;
  }

  getRenderables(): RenderData {
    return {
      viewTransform: this.camera.getViewMatrix(),
      modelTransforms: this.objectData,
      objectCounts: {} as never,
    };
  }

  buildRenderData(aspect: number): InternalRenderData {
    return {
      viewMatrix:       new Float32Array(this.camera.getViewMatrix()        as unknown as ArrayLike<number>),
      projectionMatrix: new Float32Array(this.camera.getProjectionMatrix(aspect) as unknown as ArrayLike<number>),
      skyParams:        this.camera.getSkyParams(aspect),
      modelTransforms:  this.objectData,
      worldCalls:       [],
      overlayCalls:     [],
      skyboxId:         undefined,
    };
  }

  protected updateObjectBufferFromModelMatrix(index: number, model = mat4.create()): void {
    for (let j = 0; j < 16; j++) {
      this.objectData[16 * index + j] = model.at(j) as number;
    }
  }
}
