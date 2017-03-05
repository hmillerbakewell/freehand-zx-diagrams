import Diagrams = require("./freehand-diagrams.js");
import SVG = require("svgjs");
import DiagramIO = require("./freehand-io.js");
export declare class ZXSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
    targetDiagram: Diagrams.Diagram;
    constructor(targetDiagram: Diagrams.Diagram);
    onDiagramChange(): void;
    SVG: SVG.Container;
    toZXSVG(): void;
}
