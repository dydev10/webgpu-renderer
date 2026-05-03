import { mat4, quat } from 'gl-matrix';
import { Camera } from '../model/camera';
import type { SkyboxMaterial } from '../material/SkyboxMaterial';
import type { Mesh } from '../mesh/Mesh';
import type { Geometry } from '../geometry/Geometry';
import type { AnyMaterial, RendererContext, SceneConfig } from '../types/public';
import type { InternalRenderData } from '../types/internal';
import type { ResourceRegistry } from '../registry/ResourceRegistry';

export abstract class Scene {
  abstract camera: Camera;
  skybox?: SkyboxMaterial;
  protected objectData: Float32Array;
  protected meshEntries: { mesh: Mesh; slot: number }[] = [];
  protected registry?: ResourceRegistry;
  private nextSlot = 0;
  private freeSlots: number[] = [];

  constructor(config?: SceneConfig) {
    const buf = config?.sharedTransformBuffer
      ?? new ArrayBuffer((config?.maxObjects ?? 1024) * 64);
    this.objectData = new Float32Array(buf);
  }

  add(mesh: Mesh): Mesh {
    const slot = this.freeSlots.length > 0 ? this.freeSlots.pop()! : this.nextSlot++;
    this.meshEntries.push({ mesh, slot });
    return mesh;
  }

  remove(mesh: Mesh): void {
    const entry = this.meshEntries.find(e => e.mesh === mesh);
    if (entry) this.freeSlots.push(entry.slot);
    this.meshEntries = this.meshEntries.filter(e => e.mesh !== mesh);
  }

  abstract update(dt?: number): void;

  async onAttach(renderer: RendererContext): Promise<void> {
    this.registry = (renderer as unknown as { registry: ResourceRegistry }).registry;
  }

  onDetach(): void {
    const geos = new Set<Geometry>();
    const mats = new Set<AnyMaterial>();

    for (const { mesh } of this.meshEntries) {
      if (mesh.geometry !== null) geos.add(mesh.geometry);
      mats.add(mesh.material);
    }

    for (const geo of geos) geo.destroy();
    for (const mat of mats) mat.destroy();

    this.skybox?.destroy();
    this.meshEntries = [];
  }

  buildRenderData(aspect: number): InternalRenderData {
    for (const { mesh, slot } of this.meshEntries) {
      const q = quat.create();
      quat.fromEuler(q, mesh.rotation[0], mesh.rotation[1], mesh.rotation[2]);
      const m = mat4.create();
      mat4.fromRotationTranslationScale(m, q, mesh.position, mesh.scale);
      this.objectData.set(m as unknown as Float32Array, slot * 16);
    }

    const worldCalls   = [];
    const overlayCalls = [];
    const shaderCalls  = [];

    if (this.registry) {
      for (const { mesh, slot } of this.meshEntries) {
        const materialId = this.registry.getOrRegister(mesh.material);

        if (mesh.geometry === null) {
          shaderCalls.push(materialId);
          continue;
        }

        const geometryId = this.registry.getOrRegister(mesh.geometry);
        const call = { geometryId, materialId, instanceCount: 1, firstInstance: slot };
        if (mesh.layer === 'overlay') overlayCalls.push(call);
        else worldCalls.push(call);
      }
    }

    return {
      viewMatrix:       new Float32Array(this.camera.getViewMatrix()              as unknown as ArrayLike<number>),
      projectionMatrix: new Float32Array(this.camera.getProjectionMatrix(aspect)  as unknown as ArrayLike<number>),
      skyParams:        this.camera.getSkyParams(aspect),
      modelTransforms:  this.objectData,
      worldCalls,
      overlayCalls,
      shaderCalls,
      skyboxId: this.skybox && this.registry ? this.registry.getOrRegister(this.skybox) : undefined,
    };
  }

}
