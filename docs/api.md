# API Reference

## WebGPURenderer

The main class. Owns the GPU device, all pipelines, and the resource registry.

```ts
class WebGPURenderer {
  readonly canvas:   HTMLCanvasElement
  readonly registry: ResourceRegistry
  device:            GPUDevice           // available after initialize()

  constructor(canvas: HTMLCanvasElement, config?: RendererConfig)

  initialize(): Promise<void>            // sets up device, pipelines, calls scene.onAttach()
  start(): void                          // starts the requestAnimationFrame loop
  stop(): void                           // cancels the loop
  renderFrame(dt?: number): void         // runs one frame manually (raw mode)
  setScene(scene: Scene): Promise<void>  // hot-swaps the active scene; calls onDetach/onAttach
  destroy(): void                        // stops the loop and calls scene.onDetach()
}
```

**RendererConfig**

```ts
interface RendererConfig {
  scene?:           Scene | null              // null = raw mode, omit = StarterScene
  powerPreference?: GPUPowerPreference
  onFrame?:         (dt: number) => void
  onError?:         (err: Error) => void
  onResize?:        (width: number, height: number) => void  // called after canvas pixel dims update
}
```

The renderer sets up a `ResizeObserver` on the canvas during `initialize()`. When the canvas CSS size changes, it updates `canvas.width` and `canvas.height` accounting for `devicePixelRatio`, recreates the framebuffers on the next frame, and calls `onResize` if provided. No external `ResizeObserver` is needed.

---

## Scene

Abstract base class for all scenes. Extend this to build custom scenes.

```ts
abstract class Scene {
  camera:   Camera
  skybox?:  SkyboxMaterial

  constructor(config?: SceneConfig)

  add(mesh: Mesh): Mesh        // registers a mesh and assigns it a transform slot
  remove(mesh: Mesh): void     // removes a mesh (slot is not reused -- see architecture docs)

  abstract update(dt?: number): void

  // Lifecycle -- called by the renderer, not by consumer code
  onAttach(renderer: unknown): Promise<void>  // load assets here; call super.onAttach() first
  onDetach(): void
}
```

**SceneConfig**

```ts
interface SceneConfig {
  maxObjects?:            number             // default 1024
  sharedTransformBuffer?: SharedArrayBuffer  // see architecture docs
}
```

---

## StarterScene

A ready-made scene shipped with the library. Contains a field of spinning triangles, a tiled floor, a rotating statue model, and a skybox. Creates a `FirstPersonController` bound to the renderer canvas during `onAttach`.

```ts
class StarterScene extends Scene {
  // No public API beyond Scene. Assets are loaded in onAttach().
}
```

---

## Camera

Stores position and orientation. Computes the view matrix, projection matrix, and sky ray parameters on demand.

```ts
class Camera {
  position: vec3          // world-space position
  eulers:   vec3          // [roll, pitch, yaw] in degrees
  forwards: vec3          // unit vector, recomputed by update()
  right:    vec3
  up:       vec3
  fov:      number        // radians, default Math.PI / 4
  near:     number        // default 0.1
  far:      number        // default 100

  constructor(position: vec3, theta: number, phi: number)

  update(): void                              // recomputes forwards/right/up and view matrix
  getViewMatrix(): mat4
  getProjectionMatrix(aspect: number): mat4
  getSkyParams(aspect: number): Float32Array  // packed sky ray uniforms
}
```

Call `camera.update()` once per frame, after modifying `position` or `eulers`.

---

## Mesh

Pairs a geometry and a material with a transform and a render layer.

```ts
type RenderLayer = 'world' | 'overlay'

class Mesh {
  readonly geometry:  Geometry
  readonly material:  Material
  readonly transform: mat4         // identity on construction; mutate directly
  readonly layer:     RenderLayer  // default 'world'

  constructor(geometry: Geometry, material: Material, layer?: RenderLayer)
}
```

`'world'` meshes are drawn with view and projection applied. `'overlay'` meshes (such as a gun model) are drawn projection-only into a separate framebuffer and composited on top.

Vertex layout contract:
- World pipeline: 20-byte layout (position + texcoord)
- Overlay pipeline: 32-byte layout (position + texcoord + normal)

---

## Geometry

Abstract base. All geometry classes extend this.

```ts
abstract class Geometry {
  abstract buffer:       GPUBuffer
  abstract vertexCount:  number
  abstract bufferLayout: GPUVertexBufferLayout

  destroy(): void  // destroys the underlying GPUBuffer
}
```

**ObjGeometry**

Parses a Wavefront OBJ file. Positions are always included. Texcoords and normals are optional.

```ts
class ObjGeometry extends Geometry {
  static load(
    device:   GPUDevice,
    url:      string,
    options?: MeshLoadOptions
  ): Promise<ObjGeometry>
}

interface MeshLoadOptions {
  normals?:      boolean            // default false
  texCoords?:    boolean            // default true
  flipV?:        boolean            // default true; set false if OBJ was exported with V already flipped
  preTransform?: ArrayLike<number>  // mat4 applied to all vertices at load time
}
```

**TriangleGeometry**

A single equilateral triangle. Vertex layout: position + texcoord (20 bytes, 3 vertices).

```ts
class TriangleGeometry extends Geometry {
  constructor(device: GPUDevice)
}
```

**QuadGeometry**

A unit quad (two triangles). Vertex layout: position + texcoord (20 bytes, 6 vertices).

```ts
class QuadGeometry extends Geometry {
  constructor(device: GPUDevice)
}
```

---

## Material

A 2D texture material. Creates a GPU texture, view, sampler, and bind group from a URL or an existing `ImageBitmap`.

```ts
class Material {
  readonly bindGroup: GPUBindGroup

  static fromURL(device: GPUDevice, url: string): Promise<Material>
  static fromBitmap(device: GPUDevice, bitmap: ImageBitmap): Promise<Material>

  destroy(): void  // destroys the underlying GPU texture
}
```

---

## SkyboxMaterial

A cube-map texture for the sky pass. Expects exactly six image URLs in the order: back, front, left, right, top, bottom.

```ts
class SkyboxMaterial {
  readonly view:    GPUTextureView
  readonly sampler: GPUSampler

  static fromURLs(
    device: GPUDevice,
    urls:   [string, string, string, string, string, string]
  ): Promise<SkyboxMaterial>

  destroy(): void  // destroys the underlying GPU texture
}
```

Assign to `scene.skybox` to enable sky rendering.

---

## FirstPersonController

WASD movement and mouse-look. Writes deltas directly to a `Camera` each frame.

```ts
class FirstPersonController {
  speed:       number  // units per frame, default 0.02
  sensitivity: number  // divisor for mouse movement, default 5

  constructor(canvas: HTMLCanvasElement, camera: Camera)

  enable():  void  // registers all event listeners (called in constructor)
  disable(): void  // removes all event listeners
  dispose(): void  // alias for disable()
  update():  void  // flushes queued deltas to camera.eulers and camera.position
}
```

Call `update()` once per frame before `camera.update()`. Click the canvas to lock the pointer -- mouse movement is only processed while the pointer is locked.

---

## Handle types

Handles are branded numbers used to reference GPU resources across the scene-renderer boundary. Consumer code does not need to manage them directly.

```ts
type GeometryHandle = number & { readonly _b: 'geo' }
type MaterialHandle = number & { readonly _b: 'mat' }
type SkyboxHandle   = number & { readonly _b: 'sky' }
```