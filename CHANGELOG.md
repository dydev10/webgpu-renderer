# Changelog

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
