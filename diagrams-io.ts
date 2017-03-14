import Diagrams = require("./diagrams.js")


// IDEALLY EXTEND THESE CLASSES BEFORE USING THEM.
// SO THAT EACH <theory>-io.ts LINKS TO EACH USE OF THESE CLASSES IN THAT THEORY

/** EXTEND THIS. Basic IO module. */
export class DiagramIOModule implements
    Diagrams.IDiagramInput {
    importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
    outputDiagram: Diagrams.Diagram
    constructor() {
        this.outputDiagram = new Diagrams.Diagram()
    }
}


// IO Pipes are an exception; they should be used without extension
/** Joins upstream callers to downstream listeners */
export class IOPipe implements Diagrams.IStreamListener {
    private _upstreamDiagram: Diagrams.IDiagramOutput & Diagrams.IStreamCaller
    private _downstreamDiagram: Diagrams.IDiagramInput
    get downstreamDiagram() {
        return this._downstreamDiagram
    }
    get upstreamDiagram() {
        return this._upstreamDiagram
    }
    constructor(upstream: Diagrams.IDiagramOutput & Diagrams.IStreamCaller,
        downstream: Diagrams.IDiagramInput) {
        this._upstreamDiagram = upstream
        this._downstreamDiagram = downstream
        this._upstreamDiagram.subscribe(this)
    }
    upstreamChange: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        this.downstreamDiagram.importRewriteDiagram(diagram)
    }
}

/** Simple IO module with a jquery selector */
export class DiagramIOHTMLModule
    extends DiagramIOModule {
    UISelector: string
    constructor() {
        super()
    }
}


// SVG Interfaces

/** Data for drawing an edge */
export interface ISVGEdgeData {
    RDPWaypoints: Diagrams.IDiagramPosition[],
    path: string
}

/** Data for drawing a vertex */
export interface ISVGVertexData {
    radius: number
}

/** Data for drawing a path */
export interface ISVGPath {
    path: string
}

/** Data for drawing a rectangle */
export interface ISVGRect {
    width: number
    height: number
    x: number
    y: number
}

/** Data for drawing a circle */
export interface ISVGCircle {
    radius: number
    cx: number
    cy: number
}

/** Data for whether an object has been inferred.
 * (As opposed to user explicitly stated.)
 */
export interface IDataInferred {
    inferred: boolean
}