import type { GeometryHandle, MaterialHandle, SkyboxHandle } from './handles'

export interface DrawCall {
  geometryId:    GeometryHandle
  materialId:    MaterialHandle
  instanceCount: number
  firstInstance: number
}

export interface InternalRenderData {
  viewMatrix:       Float32Array
  projectionMatrix: Float32Array
  skyParams:        Float32Array
  modelTransforms:  Float32Array
  worldCalls:       DrawCall[]
  overlayCalls:     DrawCall[]
  shaderCalls:      MaterialHandle[]
  skyboxId?:        SkyboxHandle
}
