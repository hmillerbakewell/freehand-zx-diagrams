// A graphical theory schematic lists the vertex-types and edge-types allowed in theory

export enum EDGETYPES { PLAIN }
export enum VERTEXTYPES { Z, X, HADAMARD, WIRE, INPUT, OUTPUT }
export interface IEdge {
    type: EDGETYPES
}
export interface IVertex {
    type: VERTEXTYPES,
    label: string
}