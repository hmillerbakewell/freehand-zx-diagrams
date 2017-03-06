import Diagrams = require("./freehand-diagrams.js")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

export class DiagramsJSONIOModule extends DiagramIO.DiagramIOHTMLModule {
    targetDiagram: Diagrams.Diagram
    constructor(targetDiagram: Diagrams.Diagram) {
        super(targetDiagram)
        this.upstreamChange = this.onDiagramChange
        this.targetDiagram.subscribe(this)
    }
    onDiagramChange: () => void = () => {
        $(this.UISelector).val(this._targetDiagram.toString())
    }
    onJSONChange: () => void = () => {
        var parsed: Diagrams.Diagram;
        try {
            parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            this.targetDiagram.importRewriteDiagram(parsed)
        }
    }
}