import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")

export class DiagramIOHTMLModule implements Diagrams.IDiagramInput, Diagrams.IUpstreamListener {
    protected _targetDiagram: Diagrams.IDiagramInput
    get targetDiagram() {
        return this._targetDiagram
    }
    UISelector: string
    importEdge: (edge: Diagrams.Edge) => void
    importVertex: (vertex: Diagrams.Vertex) => void
    importRewriteDiagram: (diagram: Diagrams.Diagram) => void
    upstreamChange: () => void
    constructor(targetDiagram: Diagrams.IDiagramInput) {
        this._targetDiagram = targetDiagram
        this.upstreamChange = function () {
            console.log("This element has subscribed to upstream changes, but not implemented a handler.")
        }
    }
}


export interface IFreehandOnSVGEdge {
    RDPWaypoints: Diagrams.IDiagramPosition[]
}
