export declare enum EDGETYPES {
    PLAIN = 0,
}
export declare enum VERTEXTYPES {
    Z = 0,
    X = 1,
    HADAMARD = 2,
    WIRE = 3,
    INPUT = 4,
    OUTPUT = 5,
}
export interface IEdge {
    type: EDGETYPES;
}
export interface IVertex {
    type: VERTEXTYPES;
    label: string;
}
