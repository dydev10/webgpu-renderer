export interface RendererContext {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  readonly canvas: HTMLCanvasElement
}

export interface AnyMaterial {
  readonly kind: string
  readonly bindGroup: GPUBindGroup
  destroy(): void
}

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
  flipV?:        boolean             // default true; set false if OBJ was exported with V already flipped
  preTransform?: ArrayLike<number>
}
