import { Scene } from "../model/scene";
import { Renderer } from "../view/renderer";

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  scene: Scene;

  keyLabel: HTMLElement;
  mouseXLabel: HTMLElement;
  mouseYLabel: HTMLElement;

  forwardsAmount: number;
  rightAmount: number;
  isPointerLocked: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this.canvas);
    this.scene = new Scene();
    
    this.forwardsAmount = 0;
    this.rightAmount = 0;
    this.isPointerLocked = false;

    // Debug
    this.keyLabel = document.querySelector('#key-label') as HTMLElement;
    this.mouseXLabel = document.querySelector('#mouse-x-label') as HTMLElement;
    this.mouseYLabel = document.querySelector('#mouse-y-label') as HTMLElement;
  
    // Register input events    
    document.addEventListener('keydown', this.handleKeyPress);
    document.addEventListener('keyup', this.handleKeyRelease);
    document.addEventListener('mousemove', this.handleMouseMove);

    // Canvas click lock
    this.canvas.addEventListener('click', this.handleClickToPointerLock);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  async init() {
    await this.renderer.Initialize();
  }

  run = () => {
    const running = true;

    this.scene.update();
    this.scene.movePlayer(this.forwardsAmount, this.rightAmount);

    this.renderer.render(
      this.scene.getPlayer(),
      this.scene.getTriangles()
    );

    if(running) {
      requestAnimationFrame(this.run);
    }
  }

  handleKeyPress = (event: KeyboardEvent) => {
    this.keyLabel.innerText = event.code;    
    
    if (event.code === 'KeyW') {
      this.forwardsAmount = 0.02;      
    }
    if (event.code === 'KeyS') {
      this.forwardsAmount = -0.02;
    }
    if (event.code === 'KeyA') {
      this.rightAmount = -0.02;
    }
    if (event.code === 'KeyD') {
      this.rightAmount = 0.02;
    }
  }

  handleKeyRelease = (event: KeyboardEvent) => {
    // this.keyLabel.innerText = '';        
  
    if (event.code === 'KeyW') {
      this.forwardsAmount = 0;
    }
    if (event.code === 'KeyS') {
      this.forwardsAmount = 0;
    }
    if (event.code === 'KeyA') {
      this.rightAmount = 0;
    }
    if (event.code === 'KeyD') {
      this.rightAmount = 0;
    }
  }

  handleMouseMove = (event: MouseEvent) => {
    // SKip if not pointer locked
    if(!this.isPointerLocked) {
      return;
    }

    this.mouseXLabel.innerText = event.clientX.toString();    
    this.mouseYLabel.innerText = event.clientY.toString();
    
    this.scene.spinPlayer(
      event.movementX / 5,
      -event.movementY / 5
    );
  }

  handleClickToPointerLock = () => {
    if(!this.isPointerLocked) {
    this.canvas.requestPointerLock();
    }
  }

  handlePointerLockChange = () => {
    if (document.pointerLockElement === this.canvas) {
        this.isPointerLocked = true;
    } else {
      this.isPointerLocked = false;
    }
  }
}