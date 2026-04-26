import { Camera } from '../model/camera';
import { Scene } from './Scene';

export class EmptyScene extends Scene {
  constructor() {
    super();
    this.camera = new Camera([0, 0, 1], 0, 0);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  update(): void {}
}
