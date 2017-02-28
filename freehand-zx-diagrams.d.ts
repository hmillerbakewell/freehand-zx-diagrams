export declare class uID {
    constructor();
    id: string;
}
export declare class DiagramOptions {
    interpolationDistance: number;
    closingEdgeLoopDistance: number;
    closingEdgeVertexDistance: number;
    closingEdgeEdgeDistance: number;
}
export declare let _diagramOptions: DiagramOptions;
export declare class TypedId extends uID {
    type: string;
    constructor();
}
export declare class DrawnObject extends TypedId {
    start: number[];
    end: number[];
    length: number;
    bbox: number[];
    waypoints: number[][];
    constructor();
}
export declare class DiagramPosition {
    x: number;
    y: number;
    constructor(xyArray: {
        [id: number]: number;
    });
}
export declare class Vertex extends TypedId {
    pos: DiagramPosition;
    data: string;
    drawn: DrawnObject | null;
    constructor(pos: DiagramPosition);
}
export declare class Edge extends TypedId {
    start: VertexGap;
    end: VertexGap;
    data: string;
    drawn: DrawnObject | null;
    constructor(start: DiagramPosition, end: DiagramPosition);
}
export declare class VertexGap extends TypedId {
    vertex: Vertex | null;
    pos: DiagramPosition;
    constructor(pos: DiagramPosition);
}
export declare class Diagram extends TypedId {
    edges: Edge[];
    vertices: Vertex[];
    inferredVertices: Vertex[];
    unpluggedVertexGaps: VertexGap[];
    paths: DrawnObject[];
    pathDictionary: {
        [path: string]: (Edge | Vertex);
    };
    constructor();
    addPath(path: string): any;
    refreshGapList(): void;
    emptyVertexGaps(): void;
    fillVertexGaps(): void;
    toSimpleGraph(): string;
}
