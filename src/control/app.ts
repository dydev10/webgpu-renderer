import { WebGPURenderer } from '../renderer/WebGPURenderer';

export class App {
  private renderer: WebGPURenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGPURenderer(canvas);
  }

  async init() {
    await this.renderer.initialize();
  }

  run() {
    this.renderer.start();
  }
}
