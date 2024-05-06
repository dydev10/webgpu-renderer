import { App } from './control/app';
import './style.css';

let isWebGPUSupported = false;
const outputLabel: HTMLElement = document.querySelector('#compatibility-check') as HTMLElement;

// Check Compatibility
if(navigator.gpu) {
  isWebGPUSupported = true;
}

outputLabel.innerText = isWebGPUSupported
  ? 'WebGPU Enabled'
  : 'WebGPU Not Supported';


const canvas: HTMLCanvasElement = document.querySelector('#gfx-main') as HTMLCanvasElement;

// const render = new Renderer(canvas);
const app = new App(canvas);

// Start App
app.init().then(() => app.run());