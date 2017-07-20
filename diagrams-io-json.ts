import Diagrams = require("./diagrams.js")
import $ = require("jquery")
import IO = require("./diagrams-io")

/** HTML IO module that expresses the JSON of the underlying diagram. */
export class DiagramsJSONIOModule extends IO.DiagramIOHTMLModule {
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
