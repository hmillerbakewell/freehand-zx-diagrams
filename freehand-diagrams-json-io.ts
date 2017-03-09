import Diagrams = require("./freehand-diagrams.js")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

export class DiagramsJSONIOModule extends DiagramIO.DiagramIOHTMLModule {
    constructor() {
        super()
    }
    importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        $(this.UISelector).val(diagram.toJSON())
    }
    onJSONChange: () => void = () => {
        var parsed: Diagrams.Diagram;
        try {
            parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            (<Diagrams.Diagram>this.outputDiagram).importRewriteDiagram(parsed)
        }
    }
}