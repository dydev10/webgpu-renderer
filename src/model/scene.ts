import { vec3 } from "gl-matrix";
import { Camera } from "./camera";
import { Triangle } from "./triangle";


export class Scene{
  triangles: Triangle[];
  player: Camera;

  constructor() {
    this.triangles = [];
    this.triangles.push(
      new Triangle(
        [2, 0, 0],
        0
      )
    );

    this.player = new Camera(
      [-2, 0, 0.5],
      0,
      0
    );
  }

  update() {
    this.triangles.forEach(
      (triangle: Triangle) => triangle.update()
    );

    this.player.update();
  }

  spinPlayer = (dX: number, dY: number) => {
    this.player.eulers[2] -= dX;
    this.player.eulers[2] %=360;

    this.player.eulers[1] = Math.min(
      89, Math.max(
        -89,
        this.player.eulers[1] + dY
      )
    );
  }

  movePlayer = (forwardsAmount: number, rightAmount: number) =>  {
    vec3.scaleAndAdd(
      this.player.position,
      this.player.position,
      this.player.forwards,
      forwardsAmount
    );
    
    vec3.scaleAndAdd(
      this.player.position,
      this.player.position,
      this.player.right,
      rightAmount
    );
  }

  getPlayer(): Camera {
    return this.player;
  }
  getTriangles(): Triangle[] {
    return this.triangles;
  }
}
