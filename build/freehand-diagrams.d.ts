export declare abstract class uID {
    protected _id: string;
    constructor();
    readonly id: string;
}
export declare class DiagramOptions {
    interpolationDistance: number;
    closingEdgeLoopDistance: number;
    closingEdgeVertexDistance: number;
    closingEdgeEdgeDistance: number;
}
export declare let _diagramOptions: DiagramOptions;
export declare abstract class TypedId extends uID {
    protected _type: string;
    constructor();
    readonly type: string;
}
export declare class DrawnObject extends TypedId {
    start: number[];
    end: number[];
    length: number;
    bbox: number[];
    waypoints: number[][];
    constructor();
}
export interface IDiagramPosition {
    x: number;
    y: number;
}
export declare function posnDistanceSquared(a: IDiagramPosition, b: IDiagramPosition): number;
export declare class Vertex extends TypedId {
    pos: IDiagramPosition;
    data: string;
    drawn: DrawnObject | null;
    constructor(pos: IDiagramPosition);
}
export declare class Edge extends TypedId {
    start: VertexGap;
    end: VertexGap;
    data: any;
    drawn: DrawnObject | null;
    constructor(start: IDiagramPosition, end: IDiagramPosition);
}
export declare class VertexGap extends TypedId {
    vertex: Vertex | null;
    pos: IDiagramPosition;
    constructor(pos: IDiagramPosition);
}
export interface IDiagramInput {
    importEdge: (edge: Edge) => void;
    importVertex: (vertex: Vertex) => void;
    importRewriteDiagram: (diagram: Diagram) => void;
}
export interface IUpstreamListener {
    upstreamChange: () => void;
}
export declare class Diagram extends TypedId implements IDiagramInput {
    private listeners;
    subscribe: (handler: IUpstreamListener) => void;
    private fireChange;
    importEdge: (edge: Edge) => void;
    importVertex: (vertex: Vertex) => void;
    importRewriteDiagram: (diagram: Diagram) => void;
    edges: Edge[];
    vertices: Vertex[];
    inferredVertices: Vertex[];
    private unpluggedVertexGaps;
    constructor();
    private refreshGapList();
    private emptyVertexGaps();
    private fillVertexGaps();
    toSVGDrawing(svgIdentifier: string): void;
}
