import Diagrams = require("./freehand-diagrams.js");
import DiagramsIO = require("./freehand-io.js");
import $ = require("jquery");
import SVG = require("svgjs");
import FreehandOnSVGIOModule = require("./freehand-zx-draw-io.js")
import ZXJSONIOModule = require("./freehand-zx-json-io.js")
import ZXSVGIOModule = require("./freehand-zx-svg-io.js")
import DiagramsJSONModule = require("./freehand-diagrams-json-io.js")

var D = new Diagrams.Diagram();
$(document).ready();

var pipe = DiagramsIO.IOPipe
var bindToD = function (IOModule: DiagramsIO.DiagramIOModule) {
    new pipe(D, IOModule)
    new pipe(IOModule.outputDiagram, D)
}

var freehandOnSVG = new FreehandOnSVGIOModule.FreehandOnSVGIOModule()
bindToD(freehandOnSVG)
var zxJSON = new ZXJSONIOModule.ZXJSONIOModule()
bindToD(zxJSON)
var zxSVG = new ZXSVGIOModule.ZXSVGIOModule()
bindToD(zxSVG)
var diagramsJSON = new DiagramsJSONModule.DiagramsJSONIOModule()
bindToD(diagramsJSON)

$(document).ready(function () {
    //zx-drawing
    freehandOnSVG.createSVGHolder('svgInputHolder')
    //zx-JSON
    zxJSON.UISelector = "#ZXJSONIOModule > .main > #JSON"
    $(zxJSON.UISelector).change(zxJSON.onJSONChange)
    //zx-SVG
    zxSVG.SVG = SVG("svgOutputHolder")
    //diagrams-JSON
    diagramsJSON.UISelector = "#DiagramsJSONIOModule > .main > #JSON"
    $(diagramsJSON.UISelector).change(diagramsJSON.onJSONChange)

    
    D.fireChange()
})