import Diagrams = require("./freehand-zx-diagrams.js");
import SVG = require("svgjs");
import DiagramIO = require("./freehand-io.js");
export declare class FreehandOnSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
    takeInput: boolean;
    currentPath: string;
    paths: string[];
    accuracyScale: number;
    svgElement: SVG.Container;
    lastTimeTriggered: number;
    mousePos: SVG.Point;
    closingVertexDistance: number;
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    createSVG: (selector: string) => void;
    cursor: (e: MouseEvent) => SVGPoint;
    constructor(targetDiagram: Diagrams.IDiagramInput);
    addPoint: (x: number, y: number) => void;
    startPath: () => void;
    endPath: () => void;
    pathToObject: (pathAsString: string) => (Diagrams.Edge | Diagrams.Vertex | null);
    drawAllShapes: () => void;
}
