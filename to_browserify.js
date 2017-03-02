
var Diagrams = require("./freehand-zx-diagrams.js");
var $ = require("jquery");
var SVG = require("svgjs");
var D = new Diagrams.Diagram();

$(document).ready(function () {

    var svgIn = SVG('svgInputHolder').size(600, 600);
    var rect = svgIn.rect(600, 600).attr({ fill: '#eee' })
    var p = svgIn.parent()
    var boundingRect = p.getBoundingClientRect()
    drawing.offsetTop = boundingRect.top;
    drawing.offsetLeft = boundingRect.left;
    drawing.svgElement = svgIn;
    svgIn.mousedown(function (e) {
        var mouseX = e.pageX - drawing.offsetLeft;
        var mouseY = e.pageY - drawing.offsetTop;

        drawing.takeInput = true;
        drawing.startPath();
        drawing.addPoint(mouseX, mouseY);
    });

    svgIn.mouseup(function (e) {
        var mouseX = e.pageX - drawing.offsetLeft;
        var mouseY = e.pageY - drawing.offsetTop;

        drawing.addPoint(mouseX, mouseY);
        drawing.endPath();
        drawing.takeInput = false;
    });

    svgIn.mousemove(function (e) {
        var mouseX = e.pageX - drawing.offsetLeft;
        var mouseY = e.pageY - drawing.offsetTop;
        drawing.addPoint(mouseX, mouseY);

    });
    svgIn.mouseout(function (e) {
        //drawing.takeInput = false;
        //drawing.endPath();
    });


});

var drawing = {
    takeInput: false,
    currentPath: "",
    paths: [],
    accuracyScale: 1,
    svgElement: null,
    offsetTop: 0,
    offsetLeft: 0,
    lastTimeTriggered: 0
}

drawing.addPoint = function (x, y) {
    console.log("" + x + ", " + y);
    drawing.lastTimeTriggered = (new Date()).getMilliseconds()
    if (drawing.takeInput) {
        var round = function (x) {
            return Math.round(x * drawing.accuracyScale) / drawing.accuracyScale;
        }
        var s = this.currentPath.length === 0 ? "M" : "L";
        s += round(x);
        s += ", ";
        s += round(y);
        s += " ";
        this.currentPath += s;
        this.svgElement.path(this.currentPath).stroke("black").fill("transparent");
    }
}

drawing.startPath = function () {
    drawing.currentPath = "";
}

drawing.endPath = function () {
    var s = drawing.currentPath;
    drawing.paths.push(s);
    drawing.currentPath = null;
    drawing.drawAllShapes();
    D.addPath(s.replace(/[a-zA-Z]/g, "").replace(/[ ,]+/g, " ").trim())
    $("pre#JSONOutputHolder").html(JSON.stringify(JSON.parse(D.toSimpleGraph()), undefined, 2))
}

drawing.drawAllShapes = function () {
    var svg = drawing.svgElement;
    svg.clear();
    for (var shape in drawing.paths) {
        var pathDrawn = drawing.paths[shape];
        if (pathDrawn !== null && pathDrawn.length > 0) {
            svg.path(pathDrawn).stroke("black").fill("transparent");
        }
    }
}
