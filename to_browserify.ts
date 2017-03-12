import Diagrams = require("./diagrams.js");
import DiagramsIO = require("./diagrams-io.js");
import $ = require("jquery");
import SVG = require("svgjs");
import FreehandOnSVGIOModule = require("./zx-io-draw.js")
import ZXJSONIOModule = require("./zx-io-json.js")
import ZXSVGIOModule = require("./zx-io-svg.js")
import DiagramsJSONModule = require("./diagrams-io-json.js")

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