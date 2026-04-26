import { Geometry } from '../geometry/Geometry';
import { SkyboxMaterial } from '../material/SkyboxMaterial';
import type { AnyMaterial } from '../types/public';
import type { GeometryHandle, MaterialHandle, SkyboxHandle } from '../types/handles';

export class ResourceRegistry {
  private geoKeys  = new WeakMap<Geometry,      GeometryHandle>();
  private matKeys  = new WeakMap<AnyMaterial,    MaterialHandle>();
  private skyKeys  = new WeakMap<SkyboxMaterial, SkyboxHandle>();

  private geos = new Map<GeometryHandle, Geometry>();
  private mats = new Map<MaterialHandle, AnyMaterial>();
  private skys = new Map<SkyboxHandle,   SkyboxMaterial>();

  private nextGeoId = 0;
  private nextMatId = 0;
  private nextSkyId = 0;

  getOrRegister(obj: Geometry):       GeometryHandle;
  getOrRegister(obj: AnyMaterial):    MaterialHandle;
  getOrRegister(obj: SkyboxMaterial): SkyboxHandle;
  getOrRegister(obj: Geometry | AnyMaterial | SkyboxMaterial): GeometryHandle | MaterialHandle | SkyboxHandle {
    if (obj instanceof Geometry) {
      if (!this.geoKeys.has(obj)) {
        const id = this.nextGeoId++ as GeometryHandle;
        this.geoKeys.set(obj, id);
        this.geos.set(id, obj);
      }
      return this.geoKeys.get(obj)!;
    }
    if (obj instanceof SkyboxMaterial) {
      if (!this.skyKeys.has(obj)) {
        const id = this.nextSkyId++ as SkyboxHandle;
        this.skyKeys.set(obj, id);
        this.skys.set(id, obj);
      }
      return this.skyKeys.get(obj)!;
    }
    const mat = obj as AnyMaterial;
    if (!this.matKeys.has(mat)) {
      const id = this.nextMatId++ as MaterialHandle;
      this.matKeys.set(mat, id);
      this.mats.set(id, mat);
    }
    return this.matKeys.get(mat)!;
  }

  getGeometry(id: GeometryHandle): Geometry | undefined       { return this.geos.get(id); }
  getMaterial(id: MaterialHandle): AnyMaterial | undefined    { return this.mats.get(id); }
  getSkybox(id: SkyboxHandle):     SkyboxMaterial | undefined { return this.skys.get(id); }
}
