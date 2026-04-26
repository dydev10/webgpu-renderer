# webgpu-renderer

A WebGPU renderer for the browser with a scene API, instanced geometry, skybox, and two-pass composite pipeline.

Requires a browser with WebGPU support (Chrome 113+, Edge 113+).

> **Warning:** This package is under active development and has not reached a stable 1.0 release. Expect breaking changes before v1.0.

---

## Installation

```bash
npm install @dydev10/webgpu-renderer
```

---

## Usage

**Zero config** -- starter scene, managed loop:

```ts
import { WebGPURenderer } from '@dydev10/webgpu-renderer';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const renderer = new WebGPURenderer(canvas);
await renderer.initialize();
renderer.start();
```

**Custom scene:**

```ts
import { WebGPURenderer, Scene, ObjGeometry, Material, Mesh, Camera } from '@dydev10/webgpu-renderer';

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

**Raw mode** -- manual loop:

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

## API

| Export | Description |
|--------|-------------|
| `WebGPURenderer` | Main class. Owns the GPU device, pipelines, and resource registry. Use `setScene()` to hot-swap scenes and `destroy()` to clean up. |
| `Scene` | Abstract base class. Extend to build custom scenes. |
| `StarterScene` | Built-in demo scene with geometry, skybox, and first-person controller. |
| `Camera` | Position and orientation. Computes view/projection matrices. |
| `Mesh` | Pairs a geometry and material with a transform and render layer. |
| `Geometry` | Abstract base for all geometry types. Call `destroy()` to free the GPU buffer. |
| `ObjGeometry` | Loads a Wavefront OBJ file from a URL. |
| `TriangleGeometry` | Single equilateral triangle (position + texcoord). |
| `QuadGeometry` | Unit quad (position + texcoord). |
| `Material` | 2D texture. Created from a URL or `ImageBitmap`. Call `destroy()` to free the GPU texture. |
| `FullScreenMaterial` | Full-screen shader material driven by a user-supplied WGSL fragment shader. Add with `new Mesh(null, mat)`. Call `destroy()` to free the uniform buffer. |
| `MeshShaderMaterial` | Per-mesh shader material driven by a user-supplied WGSL fragment shader. Compatible with any world-layer mesh. Call `destroy()` to free the uniform buffer. |
| `SkyboxMaterial` | Cube-map texture. Assign to `scene.skybox` to enable sky rendering. Call `destroy()` to free the GPU texture. |
| `FirstPersonController` | WASD + mouse-look. Attach to a canvas and camera. |

See [docs/api.md](docs/api.md) for full signatures and [docs/architecture.md](docs/architecture.md) for the render loop, resource registry, and threading model.
