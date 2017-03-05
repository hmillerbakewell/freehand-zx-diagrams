"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Diagrams = require("./freehand-diagrams.js");
var $ = require("jquery");
var SVG = require("svgjs");
var FreehandOnSVGIOModule = require("./freehand-draw-on-svg-io.js");
var ZXJSONIOModule = require("./freehand-zx-json-io.js");
var ZXSVGIOModule = require("./freehand-zx-svg-io.js");
var D = new Diagrams.Diagram();
$(document).ready();
var freehandOnSVG = new FreehandOnSVGIOModule.FreehandOnSVGIOModule(D);
var zxJSON = new ZXJSONIOModule.ZXJSONIOModule(D);
var zxSVG = new ZXSVGIOModule.ZXSVGIOModule(D);
$(document).ready(function () {
    freehandOnSVG.createSVG('svgInputHolder');
    zxJSON.UISelector = "#textJSONOutputHolder";
    zxSVG.SVG = SVG("svgOutputHolder");
    /*
    freehandOnSVG.takeInput = true
    freehandOnSVG.startPath()
    freehandOnSVG.addPoint(0,0)
    freehandOnSVG.addPoint(100,100)
    freehandOnSVG.addPoint(200,0)
    freehandOnSVG.addPoint(200,200)
    freehandOnSVG.endPath()
    */
});
