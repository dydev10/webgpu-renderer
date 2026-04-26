# webgpu-renderer

A WebGPU renderer for the browser. Provides a scene API, instanced geometry, a skybox, and a two-pass composite pipeline. The scene-to-renderer boundary is fully serializable, which keeps it ready for Web Worker offloading without architectural changes.

Requires a browser with WebGPU support (Chrome 113+, Edge 113+).

---

## Installation

```bash
npm install webgpu-renderer
# peer dependency
npm install gl-matrix
```

---

## Quick Start

### Zero config -- starter scene, managed loop

```ts
import { WebGPURenderer } from 'webgpu-renderer';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const renderer = new WebGPURenderer(canvas);
await renderer.initialize();
renderer.start();
```

### Custom scene

```ts
import { WebGPURenderer, Scene, ObjGeometry, Material, Mesh, Camera } from 'webgpu-renderer';

class MyScene extends Scene {
  async onAttach(renderer: WebGPURenderer) {
    await super.onAttach(renderer);
    this.camera = new Camera([-2, 0, 0.5], 0, 0);
    const geo = await ObjGeometry.load(renderer.device, '/ship.obj');
    const mat = await Material.fromURL(renderer.device, '/ship.png');
    this.add(new Mesh(geo, mat));
  }

  update(dt: number) {
    this.camera.update();
  }
}

const renderer = new WebGPURenderer(canvas, { scene: new MyScene() });
await renderer.initialize();
renderer.start();
```

### Raw mode -- consumer owns the loop

```ts
const renderer = new WebGPURenderer(canvas, { scene: null });
await renderer.initialize();

function frame() {
  renderer.renderFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

---

## API Reference

### WebGPURenderer

The main class. Owns the GPU device, all pipelines, and the resource registry.

```ts
class WebGPURenderer {
  readonly canvas:   HTMLCanvasElement
  readonly registry: ResourceRegistry
  device:            GPUDevice           // available after initialize()

  constructor(canvas: HTMLCanvasElement, config?: RendererConfig)

  initialize(): Promise<void>     // sets up device, pipelines, calls scene.onAttach()
  start(): void                   // starts the requestAnimationFrame loop
  stop(): void                    // cancels the loop
  renderFrame(dt?: number): void  // runs one frame manually (raw mode)
  dispose(): void                 // stops the loop and calls scene.onDetach()
}
```

**RendererConfig**

```ts
interface RendererConfig {
  scene?:           Scene | null              // null = raw mode, omit = StarterScene
  powerPreference?: GPUPowerPreference
  onFrame?:         (dt: number) => void
  onError?:         (err: Error) => void
  onResize?:        (width: number, height: number) => void
}
```

---

### Scene

Abstract base class for all scenes. Extend this to build custom scenes.

```ts
abstract class Scene {
  camera:   Camera
  skybox?:  SkyboxMaterial

  constructor(config?: SceneConfig)

  add(mesh: Mesh): Mesh        // registers a mesh and assigns it a transform slot
  remove(mesh: Mesh): void     // removes a mesh (slot is not reused -- see Limitations)

  abstract update(dt?: number): void

  // Lifecycle -- called by the renderer, not by consumer code
  onAttach(renderer: unknown): Promise<void>  // load assets here; call super.onAttach() first
  onDetach(): void
}
```

**SceneConfig**

```ts
interface SceneConfig {
  maxObjects?:            number              // default 1024
  sharedTransformBuffer?: SharedArrayBuffer  // see Threading
}
```

The `objectData` transform buffer is allocated from `sharedTransformBuffer` if provided. Each slot is 64 bytes (one mat4x4).

---

### StarterScene

A ready-made scene shipped with the library. Contains a field of spinning triangles, a tiled floor, a rotating statue model, and a skybox. Also creates a `FirstPersonController` bound to the renderer canvas during `onAttach`.

```ts
class StarterScene extends Scene {
  // No public API beyond Scene. Assets are loaded in onAttach().
}
```

---

### Camera

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

### Mesh

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

`'world'` meshes are drawn with view and projection applied. `'overlay'` meshes (such as a gun model) are drawn projection-only into a separate framebuffer and composited on top. The overlay pipeline expects a 32-byte vertex layout (position + texcoord + normal); the world pipeline expects 20 bytes (position + texcoord).

---

### Geometry

Abstract base. All geometry classes extend this.

```ts
abstract class Geometry {
  abstract buffer:       GPUBuffer
  abstract vertexCount:  number
  abstract bufferLayout: GPUVertexBufferLayout
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
  normals?:      boolean             // default false
  texCoords?:    boolean             // default true
  preTransform?: ArrayLike<number>   // mat4 applied to all vertices at load time
}
```

**TriangleGeometry**

A single equilateral triangle with UV coordinates. Vertex layout: position + texcoord (20 bytes, 3 vertices).

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

### Material

A 2D texture material. Creates a GPU texture, view, sampler, and bind group from a URL or an existing `ImageBitmap`.

```ts
class Material {
  readonly bindGroup: GPUBindGroup

  static fromURL(device: GPUDevice, url: string): Promise<Material>
  static fromBitmap(device: GPUDevice, bitmap: ImageBitmap): Promise<Material>
}
```

---

### SkyboxMaterial

A cube-map texture for the sky pass. Expects exactly six image URLs in the order: back, front, left, right, top, bottom.

```ts
class SkyboxMaterial {
  readonly view:    GPUTextureView
  readonly sampler: GPUSampler

  static fromURLs(
    device: GPUDevice,
    urls:   [string, string, string, string, string, string]
  ): Promise<SkyboxMaterial>
}
```

Assign to `scene.skybox` to enable sky rendering.

---

### FirstPersonController

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

`update()` must be called once per frame before `camera.update()`. In custom scenes, call it at the top of `Scene.update()`.

Click the canvas to lock the pointer. Mouse movement is only processed while the pointer is locked.

---

### Handle types

Handles are branded numbers used to reference GPU resources across the scene-renderer boundary.

```ts
type GeometryHandle = number & { readonly _b: 'geo' }
type MaterialHandle = number & { readonly _b: 'mat' }
type SkyboxHandle   = number & { readonly _b: 'sky' }
```

Handles are assigned by `ResourceRegistry.getOrRegister()` the first time a resource is seen. The same object always returns the same handle (idempotent). Consumer code does not need to manage handles directly; they are resolved internally by `buildRenderData` and the renderer.

---

## Architecture

### Render loop

Each frame driven by `WebGPURenderer.start()` follows this sequence:

```
requestAnimationFrame fires
  scene.update(dt)
  scene.buildRenderData(aspect)     -> InternalRenderData
  renderer.writeBuffers(renderData) -> uploads matrices and transforms to GPU
  encoder = createCommandEncoder()
  drawWorld(encoder, renderData)    -> sky pass then world draw calls
  drawOverlay(encoder, renderData)  -> overlay draw calls (gun, HUD geometry)
  composite(encoder)                -> post pass blits both framebuffers to canvas
  device.queue.submit(encoder)
```

`buildRenderData` produces plain serializable data (typed arrays and numbers, no GPU object references). The renderer resolves geometry and material handles to actual GPU objects via the registry on every draw call.

---

### Resource registry

`ResourceRegistry` maintains a two-way mapping between JavaScript resource objects and their numeric handles.

- A `WeakMap` maps from the object to its handle. When the JavaScript object is garbage collected, the WeakMap entry is cleaned up automatically.
- A `Map` maps from handle to object for O(1) lookup during draw calls.

Registration is idempotent: calling `getOrRegister` on the same object multiple times returns the same handle and does not create duplicate entries.

The renderer resolves handles to GPU objects (`geo.buffer`, `mat.bindGroup`) on each draw call. Resources that are removed from the scene but not yet garbage collected continue to be retrievable by handle until GC occurs.

---

### Resource management

GPU textures and buffers are created during `scene.onAttach()` (or in geometry/material constructors for non-scene use). The renderer does not own or track individual GPU objects; it only resolves handles at draw time.

Transform data for all meshes in a scene lives in a single `Float32Array` (`objectData`). Each mesh is assigned a slot (index into the array) when `scene.add(mesh)` is called. Slots are not reused after `scene.remove(mesh)` in the current version. Scenes that add and remove many objects over their lifetime will exhaust the buffer at `maxObjects * 64` bytes. The default limit is 1024 objects.

---

### Threading

The boundary between the scene and the renderer is defined by `InternalRenderData`:

```ts
interface InternalRenderData {
  viewMatrix:       Float32Array   // 16 floats
  projectionMatrix: Float32Array   // 16 floats
  skyParams:        Float32Array   // 12 floats
  modelTransforms:  Float32Array   // 16 * maxObjects floats
  worldCalls:       DrawCall[]     // geometry and material handles, instance counts
  overlayCalls:     DrawCall[]
  skyboxId?:        SkyboxHandle
}
```

This structure contains only plain numbers and typed arrays. No GPU object references cross this boundary, which means the entire object can be transferred or cloned across a `Worker` with `postMessage` without any architectural change.

To enable zero-copy transform updates from an animation or physics worker, pass a `SharedArrayBuffer` as `SceneConfig.sharedTransformBuffer`. The worker can write model matrices directly into the shared buffer while the render thread reads from the same memory:

```ts
const sab = new SharedArrayBuffer(1024 * 64);
const scene = new MyScene({ sharedTransformBuffer: sab });

// In an animation worker:
const transforms = new Float32Array(sab);
transforms.set(modelMatrix, slotIndex * 16);
```

No synchronization primitives are required for the current single-writer pattern. If multiple workers write to different slots simultaneously, atomics or slot ownership conventions should be added by the consumer.

---

## Known Limitations

- **Slot leak on remove.** Slots assigned by `scene.add()` are not reclaimed after `scene.remove()`. Long-running scenes that frequently add and remove objects will eventually exhaust the transform buffer.
- **Vertex layout contract.** World meshes must produce a 20-byte layout (position + texcoord). Overlay meshes must produce a 32-byte layout (position + texcoord + normal). This is enforced by convention, not the type system.
- **Single overlay layer.** There are two fixed framebuffers (world and overlay). A dynamic layer stack is not supported in this version.
- **No geometry batching in base Scene.** The default `buildRenderData` emits one draw call per mesh. `StarterScene` overrides this to produce instanced draw calls.
