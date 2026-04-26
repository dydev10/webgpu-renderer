import { WebGPURenderer, StarterScene } from '../../src/index';
import { SculptureScene } from './SculptureScene';
import { SpawnScene } from './SpawnScene';

const outputLabel = document.querySelector('#compatibility-check') as HTMLElement;
outputLabel.innerText = navigator.gpu ? 'WebGPU Enabled' : 'WebGPU Not Supported';

const keyLabel    = document.querySelector('#key-label')     as HTMLElement;
const mouseXLabel = document.querySelector('#mouse-x-label') as HTMLElement;
const mouseYLabel = document.querySelector('#mouse-y-label') as HTMLElement;

document.addEventListener('keydown',   (e) => { keyLabel.innerText    = e.code; });
document.addEventListener('mousemove', (e) => {
  mouseXLabel.innerText = e.clientX.toString();
  mouseYLabel.innerText = e.clientY.toString();
});

const canvas = document.querySelector('#gfx-main') as HTMLCanvasElement;
const wrapper = canvas.parentElement!;

new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect;
  const dpr = window.devicePixelRatio;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}).observe(wrapper);

const renderer = new WebGPURenderer(canvas);
await renderer.initialize();
renderer.start();

document.querySelector('#btn-starter')?.addEventListener('click', () => {
  renderer.setScene(new StarterScene());
});

document.querySelector('#btn-sculpture')?.addEventListener('click', () => {
  renderer.setScene(new SculptureScene());
});

const spawnStats    = document.querySelector('#spawn-stats')    as HTMLElement;
const statActive    = document.querySelector('#stat-active')    as HTMLElement;
const statSlots     = document.querySelector('#stat-slots')     as HTMLElement;
const statExhausted = document.querySelector('#stat-exhausted') as HTMLElement;

let activeSpawnScene: SpawnScene | null = null;

document.querySelector('#btn-spawn')?.addEventListener('click', () => {
  activeSpawnScene = new SpawnScene();
  renderer.setScene(activeSpawnScene);
  spawnStats.style.display = '';
});

setInterval(() => {
  if (!activeSpawnScene) return;
  const { active, totalSpawned, exhausted } = activeSpawnScene.stats;
  statActive.innerText    = String(active);
  statSlots.innerText     = String(totalSpawned);
  statExhausted.innerText = exhausted ? 'YES' : 'no';
}, 200);
