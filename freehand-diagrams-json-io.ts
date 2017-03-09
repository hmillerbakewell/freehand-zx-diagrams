import Diagrams = require("./freehand-diagrams.js")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

export class DiagramsJSONIOModule extends DiagramIO.DiagramIOHTMLModule {
    constructor(downstreamDiagram: Diagrams.IDiagramInput,
        upstreamDiagram: Diagrams.IDiagramOutput & Diagrams.IStreamCaller) {
        super(downstreamDiagram, upstreamDiagram)
        this.upstreamChange = this.onDiagramChange
        this.upstreamDiagram.subscribe(this)
    }
    private onDiagramChange: () => void = () => {
        $(this.UISelector).val(this.upstreamDiagram.toJSON())
    }
    onJSONChange: () => void = () => {
        var parsed: Diagrams.Diagram;
        try {
            parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            this.downstreamDiagram.importRewriteDiagram(parsed)
        }
    }
}