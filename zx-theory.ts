// A graphical theory schematic lists the vertex-types and edge-types allowed in theory

/** Allowed edge types */
export enum EDGETYPES { PLAIN }

/** Allowed vertex types */
export enum VERTEXTYPES { Z, X, HADAMARD, WIRE, INPUT, OUTPUT }

/** Necessary edge data */
export interface IEdgeData {
    type: EDGETYPES
}

/** Necessary vertex data */
export interface IVertexData {
    type: VERTEXTYPES,
    label: string
}
