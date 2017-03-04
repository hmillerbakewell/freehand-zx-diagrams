import Diagrams = require("./freehand-zx-diagrams.js");
import DiagramIO = require("./freehand-io.js");
export declare class ZXJSONIOModule extends DiagramIO.DiagramIOHTMLModule {
    targetDiagram: Diagrams.Diagram;
    constructor(targetDiagram: Diagrams.Diagram);
    onDiagramChange(): void;
    toSimpleZXGraph(): string;
}
