import { mat4 } from 'gl-matrix';
import { Scene, Camera, ObjGeometry, QuadGeometry, Material, Mesh, FirstPersonController } from '../../src/index';

export class SculptureScene extends Scene {
  private sculptureGeo?: ObjGeometry;
  private floorGeo?: QuadGeometry;
  private sculptureMat?: Material;
  private floorMat?: Material;
  private controller?: FirstPersonController;
  private sculptureAngle = 0;

  constructor() {
    super();
    this.camera = new Camera([0, -2, 0.5], 90, -15);
  }

  async onAttach(renderer: unknown): Promise<void> {
    await super.onAttach(renderer);
    const r = renderer as { device: GPUDevice; canvas: HTMLCanvasElement };

    const sculptureTransform = mat4.create();
    mat4.translate(sculptureTransform, sculptureTransform, [0, 0, 0.3]);
    mat4.rotateX(sculptureTransform, sculptureTransform, Math.PI / 2);
    mat4.scale(sculptureTransform, sculptureTransform, [0.001, 0.001, 0.001]);

    [this.sculptureGeo, this.floorGeo, this.sculptureMat, this.floorMat] = await Promise.all([
      ObjGeometry.load(r.device, '/model/sculpture.obj', { preTransform: sculptureTransform }),
      Promise.resolve(new QuadGeometry(r.device)),
      Material.fromURL(r.device, '/img/sculpture_albedo.jpg'),
      Material.fromURL(r.device, '/img/floor.png'),
    ]);

    this.add(new Mesh(this.sculptureGeo!, this.sculptureMat!));
    this.updateObjectBufferFromModelMatrix(0, mat4.create());

    let slot = 1;
    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        this.add(new Mesh(this.floorGeo!, this.floorMat!));
        const m = mat4.create();
        mat4.translate(m, m, [x, y, 0]);
        this.updateObjectBufferFromModelMatrix(slot, m);
        slot++;
      }
    }

    this.controller = new FirstPersonController(r.canvas, this.camera);
  }

  update(dt = 16): void {
    this.controller?.update();
    this.sculptureAngle += dt * 0.001;
    const m = mat4.create();
    mat4.rotateZ(m, m, this.sculptureAngle);
    this.updateObjectBufferFromModelMatrix(0, m);
    this.camera.update();
  }
}
