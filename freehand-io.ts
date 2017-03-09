import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")


export class DiagramIOModule implements
    Diagrams.IDiagramInput {
    importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
    outputDiagram: Diagrams.Diagram
    constructor() {
        this.outputDiagram = new Diagrams.Diagram()
    }
}

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

export class DiagramIOHTMLModule
    extends DiagramIOModule {
    UISelector: string
    constructor() {
        super()
    }
}


export interface IFreehandOnSVGEdge {
    RDPWaypoints: Diagrams.IDiagramPosition[],
    originalPath?: string
}

export class DiagramWithStreamchange
    extends Diagrams.Diagram
    implements Diagrams.IStreamListener {
    upstreamChange: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        if (!this.allowAny) {
            if (this.lastChange !== diagram.toJSON()) {
                this.importRewriteDiagram(diagram)
            }
        }
    }
    allowAny: boolean = false
    lastChange: string
}

export class BlockOwnChangesIO implements Diagrams.IStreamListener {

    get allowAllDiagram() {
        return this._allowAllDiagram
    }
    get blockSomeDiagram() {
        return this._blockSomeDiagram
    }

    upstreamChange: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        this.blockSomeDiagram.lastChange = diagram.toJSON()
        this.allowAllDiagram.lastChange = diagram.toJSON()
    }

    private _blockSomeDiagram: DiagramWithStreamchange
    private _allowAllDiagram: DiagramWithStreamchange

    constructor() {
        this._blockSomeDiagram = new DiagramWithStreamchange()
        this._allowAllDiagram = new DiagramWithStreamchange()
        this._allowAllDiagram.allowAny = true
    }
}
