import { Scene, Camera, QuadGeometry, Mesh, MeshShaderMaterial, RendererContext } from '../../src/index';

const FRAGMENT_SHADER = /* wgsl */`
@fragment
fn fs_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let t    = u.time * 0.002;
  let dist = length(TexCoord - vec2<f32>(0.5));
  let wave = sin(dist * 20.0 - t * 5.0) * 0.5 + 0.5;
  return vec4<f32>(wave * TexCoord.x, wave * 0.5, wave * (1.0 - TexCoord.y), 1.0);
}
`;

const GRID = 5;

export class MeshShaderScene extends Scene {
  camera = new Camera([0, -4, 3], 90, -30);

  private mat?: MeshShaderMaterial;
  private canvas?: HTMLCanvasElement;
  private elapsed = 0;

  async onAttach(renderer: RendererContext): Promise<void> {
    await super.onAttach(renderer);
    this.canvas = renderer.canvas;

    const geo = new QuadGeometry(renderer.device);
    this.mat  = MeshShaderMaterial.create(renderer.device, renderer.format, FRAGMENT_SHADER);

    const half = Math.floor(GRID / 2);
    for (let x = -half; x <= half; x++) {
      for (let y = -half; y <= half; y++) {
        this.add(new Mesh(geo, this.mat!)).setPosition([x, y, 0]);
      }
    }
  }

  update(dt = 16): void {
    this.elapsed += dt;
    this.mat?.tick(this.elapsed, this.canvas!.width, this.canvas!.height);
    this.camera.update();
  }

}
