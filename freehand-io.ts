import Diagrams = require("./freehand-zx-diagrams.js");

export class DiagramIOHTMLModule implements Diagrams.IDiagramFlow {
    sendTarget: Diagrams.Diagram
    UIElement: HTMLElement
    importEdge: (edge: Diagrams.Edge) => void
    importVertex: (vertex: Diagrams.Vertex) => void
    importRewriteDiagram: (diagram: Diagrams.Diagram) => void
    constructor(onLoad : () => void){

    }
}

let freehandOnSVG = new DiagramIOHTMLModule()

