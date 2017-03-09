import Diagrams = require("./freehand-diagrams.js");
import $ = require("jquery");
import SVG = require("svgjs");
import FreehandOnSVGIOModule = require("./freehand-zx-draw-io.js")
import ZXJSONIOModule = require("./freehand-zx-json-io.js")
import ZXSVGIOModule = require("./freehand-zx-svg-io.js")
import DiagramsJSONModule = require("./freehand-diagrams-json-io.js")

var D = new Diagrams.Diagram();
$(document).ready();

var freehandOnSVG = new FreehandOnSVGIOModule.FreehandOnSVGIOModule(D, D)
var zxJSON = new ZXJSONIOModule.ZXJSONIOModule(D, D)
var zxSVG = new ZXSVGIOModule.ZXSVGIOModule(D, D)
var diagramsJSON = new DiagramsJSONModule.DiagramsJSONIOModule(D, D)

$(document).ready(function () {
    //zx-drawing
    freehandOnSVG.createSVG('svgInputHolder')
    //zx-JSON
    zxJSON.UISelector = "#ZXJSONIOModule > .main > #JSON"
    $(zxJSON.UISelector).change(zxJSON.onJSONChange)
    //zx-SVG
    zxSVG.SVG = SVG("svgOutputHolder")
    zxSVG.toZXSVG()
    //diagrams-JSON
    diagramsJSON.UISelector = "#DiagramsJSONIOModule > .main > #JSON"
    $(diagramsJSON.UISelector).change(diagramsJSON.onJSONChange)
    D.fireChange()
})