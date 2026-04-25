export interface RendererConfig {
  scene?: unknown | null
  powerPreference?: GPUPowerPreference
  onFrame?:  (dt: number) => void
  onError?:  (err: Error) => void
  onResize?: (width: number, height: number) => void
}

export interface SceneConfig {
  maxObjects?:           number
  sharedTransformBuffer?: SharedArrayBuffer
}

export interface MeshLoadOptions {
  normals?:      boolean
  texCoords?:    boolean
  preTransform?: ArrayLike<number>
}
