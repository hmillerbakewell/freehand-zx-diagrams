import Diagrams = require("./freehand-diagrams.js");
import $ = require("jquery");
import SVG = require("svgjs");
import FreehandOnSVGIOModule = require("./freehand-draw-on-svg-io.js")
import ZXJSONIOModule = require("./freehand-zx-json-io.js")
import ZXSVGIOModule = require("./freehand-zx-svg-io.js")

var D = new Diagrams.Diagram();
$(document).ready();

var freehandOnSVG = new FreehandOnSVGIOModule.FreehandOnSVGIOModule(D)
var zxJSON = new ZXJSONIOModule.ZXJSONIOModule(D)
var zxSVG = new ZXSVGIOModule.ZXSVGIOModule(D)

$(document).ready(function () {
    freehandOnSVG.createSVG('svgInputHolder')
    zxJSON.UISelector = "#textJSONOutputHolder"
    zxSVG.SVG = SVG("svgOutputHolder")
})