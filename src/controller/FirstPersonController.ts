import { vec3 } from 'gl-matrix';
import type { Camera } from '../model/camera';

export class FirstPersonController {
  speed       = 0.02;
  sensitivity = 5;

  private forwardsAmount = 0;
  private rightAmount    = 0;
  private spinX          = 0;
  private spinY          = 0;
  private isPointerLocked = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
  ) {
    this.enable();
  }

  enable(): void {
    document.addEventListener('keydown', this.handleKeyPress);
    document.addEventListener('keyup', this.handleKeyRelease);
    document.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  disable(): void {
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('keyup', this.handleKeyRelease);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  dispose(): void {
    this.disable();
  }

  update(): void {
    this.camera.eulers[2] -= this.spinX;
    this.camera.eulers[2] %= 360;
    this.camera.eulers[1] = Math.min(89, Math.max(-89, this.camera.eulers[1] + this.spinY));
    this.spinX = 0;
    this.spinY = 0;

    vec3.scaleAndAdd(this.camera.position, this.camera.position, this.camera.forwards, this.forwardsAmount);
    vec3.scaleAndAdd(this.camera.position, this.camera.position, this.camera.right,    this.rightAmount);
  }

  private handleKeyPress = (event: KeyboardEvent) => {
    if (event.code === 'KeyW') this.forwardsAmount =  this.speed;
    if (event.code === 'KeyS') this.forwardsAmount = -this.speed;
    if (event.code === 'KeyA') this.rightAmount    = -this.speed;
    if (event.code === 'KeyD') this.rightAmount    =  this.speed;
  };

  private handleKeyRelease = (event: KeyboardEvent) => {
    if (event.code === 'KeyW' || event.code === 'KeyS') this.forwardsAmount = 0;
    if (event.code === 'KeyA' || event.code === 'KeyD') this.rightAmount    = 0;
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.isPointerLocked) return;
    this.spinX += event.movementX / this.sensitivity;
    this.spinY -= event.movementY / this.sensitivity;
  };

  private handleClick = () => {
    if (!this.isPointerLocked) this.canvas.requestPointerLock();
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  };
}
