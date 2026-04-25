import { StarterScene } from "../scene/StarterScene";
import { Renderer } from "../view/renderer";
import { FirstPersonController } from "../controller/FirstPersonController";

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  scene: StarterScene;
  controller: FirstPersonController;

  keyLabel: HTMLElement;
  mouseXLabel: HTMLElement;
  mouseYLabel: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this.canvas);
    this.scene = new StarterScene();

    this.keyLabel    = document.querySelector('#key-label')     as HTMLElement;
    this.mouseXLabel = document.querySelector('#mouse-x-label') as HTMLElement;
    this.mouseYLabel = document.querySelector('#mouse-y-label') as HTMLElement;

    document.addEventListener('keydown',   (e) => { this.keyLabel.innerText    = e.code; });
    document.addEventListener('mousemove', (e) => {
      this.mouseXLabel.innerText = e.clientX.toString();
      this.mouseYLabel.innerText = e.clientY.toString();
    });

    this.controller = new FirstPersonController(this.canvas, this.scene.camera);
  }

  async init() {
    await this.renderer.Initialize();
  }

  run = () => {
    this.controller.update();
    this.scene.update();
    this.renderer.render(
      this.scene.getRenderables(),
      this.scene.getPlayer()
    );
    requestAnimationFrame(this.run);
  };
}
