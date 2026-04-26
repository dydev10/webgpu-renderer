import { WebGPURenderer } from '../../src/index';

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
