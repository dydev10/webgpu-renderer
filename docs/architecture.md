# Architecture

## Render loop

Each frame driven by `WebGPURenderer.start()` follows this sequence:

```
requestAnimationFrame fires
  scene.update(dt)
  scene.buildRenderData(aspect)     -> InternalRenderData
  renderer.writeBuffers(renderData) -> uploads matrices and transforms to GPU
  encoder = createCommandEncoder()
  drawWorld(encoder, renderData)    -> full-screen shader calls, sky pass, then world draw calls
  drawOverlay(encoder, renderData)  -> overlay draw calls (gun, HUD geometry)
  composite(encoder)                -> post pass blits both framebuffers to canvas
  device.queue.submit(encoder)
```

`buildRenderData` produces plain serializable data (typed arrays and numbers, no GPU object references). The renderer resolves geometry and material handles to actual GPU objects via the registry on every draw call.

---

## Resource registry

`ResourceRegistry` maintains a two-way mapping between JavaScript resource objects and their numeric handles.

- A `WeakMap` maps from the object to its handle. When the JavaScript object is garbage collected, the WeakMap entry is cleaned up automatically.
- A `Map` maps from handle to object for O(1) lookup during draw calls.

Registration is idempotent: calling `getOrRegister` on the same object multiple times returns the same handle and does not create duplicate entries.

The renderer resolves handles to GPU objects (`geo.buffer`, `mat.bindGroup`) on each draw call. Resources that are removed from the scene but not yet garbage collected continue to be retrievable by handle until GC occurs.

---

## Resource management

GPU textures and buffers are created during `scene.onAttach()` (or in geometry/material constructors for non-scene use). The renderer does not own or track individual GPU objects; it only resolves handles at draw time.

`Scene.onDetach()` auto-destroys all mesh geometry, materials, and the skybox. Subclasses that override `onDetach` must call `super.onDetach()` first to ensure cleanup runs.

Transform data for all meshes in a scene lives in a single `Float32Array` (`objectData`). Each mesh is assigned a slot (index into the array) when `scene.add(mesh)` is called. Slots are returned to a free-list when `scene.remove(mesh)` is called and reused by subsequent `add()` calls. The limit applies to simultaneously active meshes, not the total ever added.

---

## Threading

The boundary between the scene and the renderer is defined by `InternalRenderData`:

```ts
interface InternalRenderData {
  viewMatrix:       Float32Array   // 16 floats
  projectionMatrix: Float32Array   // 16 floats
  skyParams:        Float32Array   // 12 floats
  modelTransforms:  Float32Array   // 16 * maxObjects floats
  worldCalls:       DrawCall[]     // geometry and material handles, instance counts
  overlayCalls:     DrawCall[]
  shaderCalls:      MaterialHandle[]  // full-screen materials; no geometry handle needed
  skyboxId?:        SkyboxHandle
}
```

Meshes with `geometry === null` are routed to `shaderCalls` by `buildRenderData`. The renderer draws them before the sky pass using their own pipeline, with no vertex buffer bound.

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

## Known limitations

- **Transform buffer limit.** The transform buffer holds `maxObjects` slots (default 1024). Slots are reclaimed when `scene.remove()` is called, so the limit applies to the number of simultaneously active meshes, not the total number ever added.
- **Vertex layout contract.** World meshes must produce a 20-byte layout (position + texcoord). Overlay meshes must produce a 32-byte layout (position + texcoord + normal). Enforced by convention, not the type system.
- **Single overlay layer.** Two fixed framebuffers (world and overlay). A dynamic layer stack is not supported in this version.
- **No geometry batching in base Scene.** The default `buildRenderData` emits one draw call per mesh. `StarterScene` overrides this to produce instanced draw calls.
