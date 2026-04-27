import { mat4, vec3 } from 'gl-matrix';
import { Camera } from '../model/camera';
import { Scene } from './Scene';
import { Triangle } from './objects/Triangle';
import { Quad } from './objects/Quad';
import { Statue } from './objects/Statue';
import { TriangleGeometry } from '../geometry/TriangleGeometry';
import { QuadGeometry } from '../geometry/QuadGeometry';
import { ObjGeometry } from '../geometry/ObjGeometry';
import { Material } from '../material/Material';
import { SkyboxMaterial } from '../material/SkyboxMaterial';
import { FirstPersonController } from '../controller/FirstPersonController';
import { degToRad } from '../model/mathHelpers';
import type { InternalRenderData } from '../types/internal';
import type { RendererContext } from '../types/public';

const SKY_URLS: [string, string, string, string, string, string] = [
  '/img/sky_back.png',
  '/img/sky_front.png',
  '/img/sky_left.png',
  '/img/sky_right.png',
  '/img/sky_top.png',
  '/img/sky_bottom.png',
];

export class StarterScene extends Scene {
  private triangles: Triangle[] = [];
  private quads: Quad[] = [];
  private statue!: Statue;
  triangleCount = 0;
  quadCount = 0;

  private triangleGeo?: TriangleGeometry;
  private quadGeo?: QuadGeometry;
  private statueGeo?: ObjGeometry;
  private gunGeo?: ObjGeometry;
  private triangleMat?: Material;
  private quadMat?: Material;
  private statueMat?: Material;
  private gunMat?: Material;
  private controller?: FirstPersonController;

  camera = new Camera([-2, 0, 0.5], 0, 0);

  constructor() {
    super();
    this.generateTriangles();
    this.generateQuads();
    this.statue = new Statue([0, 0, 0], [0, 0, 0]);
  }

  async onAttach(renderer: RendererContext): Promise<void> {
    await super.onAttach(renderer);
    const preTransform = mat4.create();

    let gunPreTransform = mat4.clone(preTransform);
    const gunTranslate = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.45, -1.0, -2.0));
    mat4.multiply(gunPreTransform, gunPreTransform, gunTranslate);
    const gunRotation = mat4.fromYRotation(mat4.create(), degToRad(180));
    mat4.multiply(gunPreTransform, gunPreTransform, gunRotation);
    const gunScale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.25, 0.25, 0.25));
    mat4.multiply(gunPreTransform, gunPreTransform, gunScale);

    [
      this.triangleGeo,
      this.quadGeo,
      this.statueGeo,
      this.gunGeo,
      this.triangleMat,
      this.quadMat,
      this.statueMat,
      this.gunMat,
      this.skybox,
    ] = await Promise.all([
      Promise.resolve(new TriangleGeometry(renderer.device)),
      Promise.resolve(new QuadGeometry(renderer.device)),
      ObjGeometry.load(renderer.device, '/model/ground.obj', { preTransform }),
      ObjGeometry.load(renderer.device, '/model/gun.obj', { normals: true, preTransform: gunPreTransform }),
      Material.fromURL(renderer.device, '/img/synth.jpg'),
      Material.fromURL(renderer.device, '/img/floor.png'),
      Material.fromURL(renderer.device, '/img/synth.jpg'),
      Material.fromURL(renderer.device, '/img/gun.png'),
      SkyboxMaterial.fromURLs(renderer.device, SKY_URLS),
    ]);

    this.controller = new FirstPersonController(renderer.canvas, this.camera);
  }

  update(_dt?: number): void {
    this.controller?.update();

    this.triangles.forEach((tri, i) => {
      tri.update();
      this.updateObjectBufferFromModelMatrix(i, tri.getModel());
    });

    this.quads.forEach((quad, i) => {
      quad.update();
      this.updateObjectBufferFromModelMatrix(i + this.triangleCount, quad.getModel());
    });

    this.statue.update();
    this.updateObjectBufferFromModelMatrix(this.triangleCount + this.quadCount, this.statue.getModel());

    this.camera.update();
  }

  override buildRenderData(aspect: number): InternalRenderData {
    const reg = this.registry!;

    const triGeoId  = reg.getOrRegister(this.triangleGeo!);
    const quadGeoId = reg.getOrRegister(this.quadGeo!);
    const statGeoId = reg.getOrRegister(this.statueGeo!);
    const gunGeoId  = reg.getOrRegister(this.gunGeo!);

    const triMatId  = reg.getOrRegister(this.triangleMat!);
    const quadMatId = reg.getOrRegister(this.quadMat!);
    const statMatId = reg.getOrRegister(this.statueMat!);
    const gunMatId  = reg.getOrRegister(this.gunMat!);

    const skyboxId = this.skybox ? reg.getOrRegister(this.skybox) : undefined;

    return {
      viewMatrix:       new Float32Array(this.camera.getViewMatrix()             as unknown as ArrayLike<number>),
      projectionMatrix: new Float32Array(this.camera.getProjectionMatrix(aspect) as unknown as ArrayLike<number>),
      skyParams:        this.camera.getSkyParams(aspect),
      modelTransforms:  this.objectData,
      worldCalls: [
        { geometryId: triGeoId,  materialId: triMatId,  instanceCount: this.triangleCount, firstInstance: 0 },
        { geometryId: quadGeoId, materialId: quadMatId, instanceCount: this.quadCount,     firstInstance: this.triangleCount },
        { geometryId: statGeoId, materialId: statMatId, instanceCount: 1,                  firstInstance: this.triangleCount + this.quadCount },
      ],
      overlayCalls: [
        { geometryId: gunGeoId, materialId: gunMatId, instanceCount: 1, firstInstance: 0 },
      ],
      shaderCalls: [],
      skyboxId,
    };
  }

  private generateTriangles(): void {
    for (let y = -5; y <= 5; y++) {
      this.triangles.push(new Triangle([2, y, 0], 0));
      this.updateObjectBufferFromModelMatrix(this.triangleCount, mat4.create());
      this.triangleCount++;
    }
  }

  private generateQuads(): void {
    let i = this.triangleCount;
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        this.quads.push(new Quad([x, y, 0]));
        this.updateObjectBufferFromModelMatrix(i, mat4.create());
        i++;
        this.quadCount++;
      }
    }
  }
}
