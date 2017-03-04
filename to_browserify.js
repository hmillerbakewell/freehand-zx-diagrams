
var Diagrams = require("./freehand-zx-diagrams.js");
var $ = require("jquery");
var SVG = require("svgjs");
var D = new Diagrams.Diagram();

$(document).ready(function () {

    var svgIn = SVG('svgInputHolder').size(600, 600).viewbox(0, 0, 100, 100);
    var rect = svgIn.rect(600, 600).attr({ fill: '#eee' })
    var p = svgIn.parent()
    var boundingRect = p.getBoundingClientRect()
    drawingInput.svgElement = svgIn;
    drawingInput.mousePos = svgIn.point()
    drawingInput.cursor = function (drawingHolder, e) {
        // From Phrogz https://stackoverflow.com/questions/10298658/mouse-position-inside-autoscaled-svg
        drawingHolder.mousePos.x = e.clientX;
        drawingHolder.mousePos.y = e.clientY;
        return drawingHolder.mousePos.transform(drawingHolder.svgElement.screenCTM().inverse());
    }
    svgIn.mousedown(function (e) {
        cursor = drawingInput.cursor(drawingInput, e)

        drawingInput.takeInput = true;
        drawingInput.startPath();
        drawingInput.addPoint(cursor.x, cursor.y);
    });

    svgIn.mouseup(function (e) {
        cursor = drawingInput.cursor(drawingInput, e)

        drawingInput.addPoint(cursor.x, cursor.y);
        drawingInput.endPath();
        drawingInput.takeInput = false;
    });

    svgIn.mousemove(function (e) {
        cursor = drawingInput.cursor(drawingInput, e)
        drawingInput.addPoint(cursor.x, cursor.y);

    });
    svgIn.mouseout(function (e) {
        //drawing.takeInput = false;
        //drawing.endPath();
    });


});

var drawingInput = {
    takeInput: false,
    currentPath: "",
    paths: [],
    accuracyScale: 1,
    svgElement: null,
    lastTimeTriggered: 0,
    mousePos: null,
    cursor: null
}

var drawingOutput = {

}

drawingInput.addPoint = function (x, y) {
    console.log("" + x + ", " + y);
    drawingInput.lastTimeTriggered = (new Date()).getMilliseconds()
    if (drawingInput.takeInput) {
        var round = function (x) {
            return Math.round(x * drawingInput.accuracyScale) / drawingInput.accuracyScale;
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

drawingInput.startPath = function () {
    drawingInput.currentPath = "";
}

drawingInput.endPath = function () {
    var s = drawingInput.currentPath;
    drawingInput.paths.push(s);
    drawingInput.currentPath = null;
    drawingInput.drawAllShapes();
    D.addPath(s.replace(/[a-zA-Z]/g, "").replace(/[ ,]+/g, " ").trim())
    $("pre#textJSONOutputHolder").html(JSON.stringify(JSON.parse(D.toSimpleGraph()), undefined, 2))
}

drawingInput.drawAllShapes = function () {
    var svg = drawingInput.svgElement;
    svg.clear();
    for (var shape in drawingInput.paths) {
        var pathDrawn = drawingInput.paths[shape];
        if (pathDrawn !== null && pathDrawn.length > 0) {
            svg.path(pathDrawn).stroke("black").fill("transparent");
        }
    }
}
