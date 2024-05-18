import { mat4, vec3 } from "gl-matrix";
import { Camera } from "./camera";
import { Triangle } from "./triangle";
import { Quad } from "./quad";
import { RenderData, objectTypes } from "./definitions";
import { Statue } from "./statue";


export class Scene{
  triangles: Triangle[];
  quads: Quad[];
  statue: Statue;
  player: Camera;
  objectData: Float32Array;
  triangleCount: number;
  quadCount: number;

  constructor() {
    this.triangles = [];
    this.quads = [];
    this.objectData = new Float32Array(16 * 1024);
    this.triangleCount = 0;
    this.quadCount = 0;

    this.generateTriangles();        
    this.generateQuads();

    this.statue = new Statue(
      [0, 0, 0],
      [0, 0, 0]
    );

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
        this.updateObjectBufferFromModelMatrix(index, model);
      }
    );
    this.quads.forEach(
      (quad: Quad, index: number) => {
        quad.update();
        const model = quad.getModel();
        this.updateObjectBufferFromModelMatrix(index + this.triangleCount, model);
      }
    );

    this.statue.update();
    const statueModel = this.statue.getModel();
    this.updateObjectBufferFromModelMatrix(this.triangleCount + this.quadCount, statueModel);


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
  };

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
  };

  getPlayer(): Camera {
    return this.player;
  }

  getRenderables(): RenderData {
    return {
      viewTransform: this.player.getView(),
      modelTransforms: this.objectData,
      objectCounts: {
        [objectTypes.TRIANGLE]: this.triangleCount,
        [objectTypes.QUAD]: this.quadCount,
      }
    };
  }

  // static functions
  generateTriangles(): void {
    let i = 0;
    for (let y = -5; y <= 5; y++) {
      this.triangles.push(
        new Triangle([2, y, 0], 0)
      );

      const blankMatrix = mat4.create();
      this.updateObjectBufferFromModelMatrix(i, blankMatrix);
      i++;
      this.triangleCount++;
    }
    return;
  }

  // static functions
  generateQuads(): void {
    let i = this.triangleCount;
    for (let x = -10; x <= 10; x++) {      
      for (let y = -10; y <= 10; y++) {
        this.quads.push(
          new Quad([x, y, 0])
        );
  
        const blankMatrix = mat4.create();
        this.updateObjectBufferFromModelMatrix(i, blankMatrix);
        i++;
        this.quadCount++;
      }
    }
    return;
  }

  updateObjectBufferFromModelMatrix(index: number, model = mat4.create()): void {
    for (let j = 0; j < 16; j++) {
      this.objectData[16 * index + j] = model.at(j) as number;
    }
  }
}
