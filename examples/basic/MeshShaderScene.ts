import { mat4 } from 'gl-matrix';
import { Scene, Camera, QuadGeometry, Mesh, MeshShaderMaterial } from '../../src/index';

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
  private mat?: MeshShaderMaterial;
  private canvas?: HTMLCanvasElement;
  private elapsed = 0;

  constructor() {
    super();
    this.camera = new Camera([0, -4, 3], 90, -30);
  }

  async onAttach(renderer: unknown): Promise<void> {
    await super.onAttach(renderer);
    const r = renderer as { device: GPUDevice; format: GPUTextureFormat; canvas: HTMLCanvasElement };
    this.canvas = r.canvas;

    const geo = new QuadGeometry(r.device);
    this.mat  = MeshShaderMaterial.create(r.device, r.format, FRAGMENT_SHADER);

    const half = Math.floor(GRID / 2);
    let slot = 0;
    for (let x = -half; x <= half; x++) {
      for (let y = -half; y <= half; y++) {
        this.add(new Mesh(geo, this.mat));
        const m = mat4.create();
        mat4.translate(m, m, [x, y, 0]);
        this.updateObjectBufferFromModelMatrix(slot++, m);
      }
    }
  }

  update(dt = 16): void {
    this.elapsed += dt;
    this.mat?.tick(this.elapsed, this.canvas!.width, this.canvas!.height);
    this.camera.update();
  }

  onDetach(): void {
    this.mat?.destroy();
    this.mat = undefined;
  }
}
