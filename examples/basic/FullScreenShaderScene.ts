import { Scene, Camera, Mesh, FullScreenMaterial } from '../../src/index';

const FRAGMENT_SHADER = /* wgsl */`
@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / u.resolution;
  let t  = u.time * 0.001;
  let r  = sin(uv.x * 8.0 + t * 1.1) * 0.5 + 0.5;
  let g  = sin(uv.y * 6.0 + t * 0.7) * 0.5 + 0.5;
  let b  = sin((uv.x + uv.y) * 5.0 + t * 0.9) * 0.5 + 0.5;
  return vec4<f32>(r, g, b, 1.0);
}
`;

export class FullScreenShaderScene extends Scene {
  private mat?: FullScreenMaterial;
  private canvas?: HTMLCanvasElement;
  private elapsed = 0;

  constructor() {
    super();
    this.camera = new Camera([0, 0, 1], 0, 0);
  }

  async onAttach(renderer: unknown): Promise<void> {
    await super.onAttach(renderer);
    const r = renderer as { device: GPUDevice; format: GPUTextureFormat; canvas: HTMLCanvasElement };
    this.canvas = r.canvas;
    this.mat = FullScreenMaterial.create(r.device, r.format, FRAGMENT_SHADER);
    this.add(new Mesh(null, this.mat));
  }

  update(dt = 16): void {
    this.elapsed += dt;
    this.mat?.tick(this.elapsed, this.canvas!.width, this.canvas!.height);
  }

  onDetach(): void {
    this.mat?.destroy();
    this.mat = undefined;
  }
}
