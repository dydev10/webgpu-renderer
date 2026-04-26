import { mat4 } from 'gl-matrix';
import { Scene, Camera, TriangleGeometry, Material, Mesh } from '../../src/index';

const SPAWN_INTERVAL = 100;  // ms between spawns
const LIFETIME       = 2000; // ms each mesh lives
const MAX_SLOTS      = 1024;

interface SpawnEntry {
  mesh:     Mesh;
  slot:     number;
  expireAt: number;
}

export class SpawnScene extends Scene {
  private geo?: TriangleGeometry;
  private mat?: Material;
  private active: SpawnEntry[] = [];
  private spawnTimer = 0;
  private totalSpawned = 0;

  readonly stats = { active: 0, totalSpawned: 0, exhausted: false };

  constructor() {
    super();
    this.camera = new Camera([0, -5, 3], 90, -20);
  }

  async onAttach(renderer: unknown): Promise<void> {
    await super.onAttach(renderer);
    const r = renderer as { device: GPUDevice };
    this.geo = new TriangleGeometry(r.device);
    this.mat = await Material.fromURL(r.device, '/img/synth.jpg');
  }

  update(dt = 16): void {
    const now = performance.now();

    for (const entry of this.active) {
      if (now >= entry.expireAt) this.remove(entry.mesh);
    }
    this.active = this.active.filter(e => now < e.expireAt);

    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.meshEntries.length < MAX_SLOTS) {
      this.spawnTimer = 0;
      const mesh = this.add(new Mesh(this.geo!, this.mat!));
      const slot = this.meshEntries[this.meshEntries.length - 1].slot;
      const m = mat4.create();
      mat4.translate(m, m, [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        0,
      ]);
      this.updateObjectBufferFromModelMatrix(slot, m);
      this.active.push({ mesh, slot, expireAt: now + LIFETIME });
      this.totalSpawned++;
    }

    this.stats.active       = this.active.length;
    this.stats.totalSpawned = this.totalSpawned;
    this.stats.exhausted    = this.meshEntries.length >= MAX_SLOTS;

    this.camera.update();
  }
}
