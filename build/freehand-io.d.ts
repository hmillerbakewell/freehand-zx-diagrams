import Diagrams = require("./freehand-zx-diagrams.js");
export declare class DiagramIOHTMLModule implements Diagrams.IDiagramInput, Diagrams.IUpstreamListener {
    protected _targetDiagram: Diagrams.IDiagramInput;
    readonly targetDiagram: any;
    UISelector: string;
    importEdge: (edge: Diagrams.Edge) => void;
    importVertex: (vertex: Diagrams.Vertex) => void;
    importRewriteDiagram: (diagram: Diagrams.Diagram) => void;
    upstreamChange: () => void;
    constructor(targetDiagram: Diagrams.IDiagramInput);
}
