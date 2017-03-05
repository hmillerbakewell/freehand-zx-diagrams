// A graphical theory schematic lists the vertex-types and edge-types allowed in theory

export enum EDGETYPES { PLAIN }
export enum VERTEXTYPES { Z, X, HADAMARD, WIRE, INPUT, OUTPUT }
export interface IEdgeData {
    type: EDGETYPES
}
export interface IVertexData {
    type: VERTEXTYPES,
    label: string
}