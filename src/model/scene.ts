import { mat4, vec3 } from "gl-matrix";
import { Camera } from "./camera";
import { Triangle } from "./triangle";


export class Scene{
  triangles: Triangle[];
  player: Camera;
  objectData: Float32Array;
  triangleCount: number;

  constructor() {
    this.triangles = [];
    this.objectData = new Float32Array(16 * 1024);
    this.triangleCount = 0;

    this.generateTriangles();        

    this.player = new Camera(
      [-2, 0, 0.5],
      0,
      0
    );
  }

  update() {
    this.triangles.forEach(
      (triangle: Triangle, index: number) => {
        triangle.update();
        const model = triangle.getModel();
        this.updateTriangleModelMatrix(index, model);
      }
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
  getTriangles(): Float32Array {
    return this.objectData;
  }

  // static functions
  generateTriangles(): void {
    let i = 0;
    for (let y = 0; y < 5; y++) {
      this.triangles.push(
        new Triangle([2, y, 0], 0)
      );

      const blankMatrix = mat4.create();
      this.updateTriangleModelMatrix(i, blankMatrix);
      i++;
      this.triangleCount++;
    }
    return;
  }

  updateTriangleModelMatrix(index: number, model = mat4.create()): void {
    for (let j = 0; j < 16; j++) {
      this.objectData[16 * index + j] = model.at(j) as number;
    }
  }
}
