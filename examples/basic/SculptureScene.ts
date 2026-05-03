import { mat4 } from 'gl-matrix';
import { Scene, Camera, ObjGeometry, QuadGeometry, Material, Mesh, FirstPersonController, RendererContext } from '../../src/index';

export class SculptureScene extends Scene {
  camera = new Camera([0, -2, 0.5], 90, -15);

  private sculptureGeo?: ObjGeometry;
  private floorGeo?: QuadGeometry;
  private sculptureMat?: Material;
  private floorMat?: Material;
  private controller?: FirstPersonController;
  private sculptureMesh?: Mesh;
  private sculptureAngle = 0;

  async onAttach(renderer: RendererContext): Promise<void> {
    await super.onAttach(renderer);

    const sculptureTransform = mat4.create();
    mat4.translate(sculptureTransform, sculptureTransform, [0, 0, 0.3]);
    mat4.rotateX(sculptureTransform, sculptureTransform, Math.PI / 2);
    mat4.scale(sculptureTransform, sculptureTransform, [0.001, 0.001, 0.001]);

    [this.sculptureGeo, this.floorGeo, this.sculptureMat, this.floorMat] = await Promise.all([
      ObjGeometry.load(renderer.device, '/model/sculpture.obj', { preTransform: sculptureTransform }),
      Promise.resolve(new QuadGeometry(renderer.device)),
      Material.fromURL(renderer.device, '/img/sculpture_albedo.jpg'),
      Material.fromURL(renderer.device, '/img/floor.png'),
    ]);

    this.sculptureMesh = this.add(new Mesh(this.sculptureGeo!, this.sculptureMat!));

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        this.add(new Mesh(this.floorGeo!, this.floorMat!)).setPosition([x, y, 0]);
      }
    }

    this.controller = new FirstPersonController(renderer.canvas, this.camera);
  }

  update(dt = 16): void {
    this.controller?.update();
    this.sculptureAngle += dt * 0.001;
    this.sculptureMesh?.setRotation([0, 0, this.sculptureAngle * (180 / Math.PI)]);
    this.camera.update();
  }
}
