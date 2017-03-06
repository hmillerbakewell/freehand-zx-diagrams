import Diagrams = require("./freehand-diagrams.js");
import $ = require("jquery");
import SVG = require("svgjs");
import FreehandOnSVGIOModule = require("./freehand-zx-draw-io.js")
import ZXJSONIOModule = require("./freehand-zx-json-io.js")
import ZXSVGIOModule = require("./freehand-zx-svg-io.js")
import DiagramsJSONModule = require("./freehand-diagrams-json-io.js")

var D = new Diagrams.Diagram();
$(document).ready();

var freehandOnSVG = new FreehandOnSVGIOModule.FreehandOnSVGIOModule(D)
var zxJSON = new ZXJSONIOModule.ZXJSONIOModule(D)
var zxSVG = new ZXSVGIOModule.ZXSVGIOModule(D)
var diagramsJSON = new DiagramsJSONModule.DiagramsJSONIOModule(D)

$(document).ready(function () {
    freehandOnSVG.createSVG('svgInputHolder')
    zxJSON.UISelector = "#textZXJSONOutputHolder"
    zxSVG.SVG = SVG("svgOutputHolder")
    zxSVG.toZXSVG()
    diagramsJSON.UISelector = "#textDiagramsJSONOutputHolder"
})