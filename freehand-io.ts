import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")

export class DiagramIOHTMLModule
    implements Diagrams.IDiagramInput, Diagrams.IStreamListener {
    private _upstreamDiagram: Diagrams.IDiagramOutput & Diagrams.IStreamCaller
    private _downstreamDiagram: Diagrams.IDiagramInput
    get upstreamDiagram() {
        return this._upstreamDiagram
    }
    get downstreamDiagram() {
        return this._downstreamDiagram
    }
    UISelector: string
    importEdge: (edge: Diagrams.Edge) => void
    importVertex: (vertex: Diagrams.Vertex) => void
    importRewriteDiagram: (diagram: Diagrams.Diagram) => void
    fireChange = () => {
        this.downstreamDiagram.fireChange()
    }
    upstreamChange: () => void
    constructor(downstreamDiagram: Diagrams.IDiagramInput,
        upstreamDiagram: Diagrams.IDiagramOutput & Diagrams.IStreamCaller) {
        this._upstreamDiagram = upstreamDiagram
        this._downstreamDiagram = downstreamDiagram
        this.upstreamChange = function () {
            console.log("This element has subscribed to upstream changes,"
                + "but not implemented a handler.")
        }
    }
}


export interface IFreehandOnSVGEdge {
    RDPWaypoints: Diagrams.IDiagramPosition[],
    originalPath?: string
}
