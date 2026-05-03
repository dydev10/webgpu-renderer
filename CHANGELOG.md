# Changelog

## [0.5.0] - unreleased

### Added

- `WebGPURenderer.isSupported()` — static async check; returns `false` if WebGPU is unavailable or no adapter found.
- `AnyMaterial.destroy(): void` added to the interface (all concrete classes already implement it).
- `Scene.onDetach()` auto-destroys all mesh geometry, materials, and skybox. Override with `super.onDetach()` first if you need additional cleanup.
- `Mesh` now has `position`, `rotation` (degrees, XYZ euler), and `scale` fields with setter methods (`setPosition`, `setRotation`, `setScale`, `setTransform`). `Scene.buildRenderData` auto-computes the world matrix each frame.

### Breaking

- `mesh.transform` (`mat4`) removed. Use `mesh.position`, `mesh.rotation`, `mesh.scale` instead.
- `Scene.updateObjectBufferFromModelMatrix()` removed. Set mesh fields directly.

---

## [0.4.0] - 2026-04-27

### Added

- `RendererContext` interface exported from the package. Use it to type the `renderer` parameter in `onAttach` instead of casting from `unknown`. `WebGPURenderer` satisfies it structurally.

### Changed

- `Scene.camera` is now `abstract`. Every subclass must declare it as a class field -- omitting it is now a compile error instead of a runtime crash on the first frame.
- `Scene.onAttach` parameter type changed from `unknown` to `RendererContext`. Subclasses that override `onAttach` must update their signature accordingly.

### Breaking

- Subclasses of `Scene` that assign `this.camera` only in the constructor without a class-level field declaration will fail to compile. Add `camera = new Camera(...)` as a class field.
- `onAttach(renderer: unknown)` overrides must be updated to `onAttach(renderer: RendererContext)`.

## [0.3.2] - 2026-04-27

### Fixed

- `new WebGPURenderer(canvas)` no longer instantiates `StarterScene` by default. The default is now an internal `EmptyScene` that renders a blank canvas and loads no assets. `StarterScene` must be passed explicitly via `config.scene`.
- `new WebGPURenderer(canvas, { scene: null })` previously fell through to `StarterScene` due to `??` treating `null` as nullish. Both `null` and omitting `scene` now consistently produce a blank canvas.

## [0.3.1] - 2026-04-27

### Fixed

- `Scene.remove()` documentation corrected -- slots are reclaimed and reused, not abandoned.

### Changed

- README now includes `FullScreenMaterial` and `MeshShaderMaterial` in the API table.
- README stability warning added: API may change before v1.0.

## [0.3.0] - 2026-04-27

### Added

- `FullScreenMaterial` -- full-screen shader material driven by a user-supplied WGSL fragment shader. Receives pixel coordinates via `@builtin(position)` and a uniform struct (`time`, `resolution`) at `@group(0) @binding(0)`. Add to a scene with `new Mesh(null, mat)`.
- `MeshShaderMaterial` -- per-mesh shader material driven by a user-supplied WGSL fragment shader. Receives interpolated UV coordinates via `@location(0) TexCoord` and a uniform struct (`time`, `resolution`) at `@group(1) @binding(0)`. Compatible with any world-layer `Mesh`.
- `AnyMaterial` interface -- structural type (`kind: string`, `bindGroup: GPUBindGroup`) used wherever a material is accepted generically. Allows user-defined material types to be registered in the resource registry without importing concrete classes.
- `Mesh` now accepts `geometry: Geometry | null`. A null geometry signals a full-screen pass; the mesh is routed to `shaderCalls` in `InternalRenderData` instead of `worldCalls`.
- `WebGPURenderer.format` is now public. Scenes can read the preferred canvas format during `onAttach` to create compatible pipelines.
- Canvas format is now determined by `navigator.gpu.getPreferredCanvasFormat()` instead of the hardcoded `'bgra8unorm'`.

### Fixed

- Switching to a scene without a skybox no longer leaves the previous scene's sky visible. `skyBindGroup` is now cleared when `makeSkyBindGroup` finds no skybox on the incoming scene.

## [0.2.0] - 2026-04-26

### Added

- `setScene(scene)` on `WebGPURenderer` -- hot-swaps the active scene by calling `onDetach` on the old scene and `onAttach` on the new one.
- `destroy()` on `Geometry`, `Material`, and `SkyboxMaterial` -- explicitly frees the underlying GPU texture or buffer.
- `destroy()` on `WebGPURenderer` -- stops the render loop, disconnects the resize observer, and calls `scene.onDetach()`.
- `flipV` option in `MeshLoadOptions` (default `true`) -- controls whether the V texture coordinate is flipped on load to match WebGPU's top-left UV origin.
- `ResizeObserver` is now set up internally by `WebGPURenderer.initialize()`. Canvas pixel dimensions are kept in sync with the CSS size and `devicePixelRatio` automatically. The `onResize` config callback is called after each update.

### Fixed

- Transform buffer slots are now reclaimed when `scene.remove()` is called. A free-list returns released slots to `scene.add()` before allocating new ones, so the 1024-slot limit applies to simultaneously active meshes rather than total meshes ever added.
- OBJ texture coordinates now have their V component flipped by default to correct for the mismatch between OBJ (bottom-left origin) and WebGPU (top-left origin) UV conventions.

## [0.1.1] - 2026-04-26

### Fixed

- Framebuffers and depth buffers are now recreated when the canvas is resized. Previously the world and overlay textures remained at their initial dimensions, causing the scene to render blurry when the canvas grew beyond its original size.

## [0.1.0] - 2026-04-26

Initial release.
