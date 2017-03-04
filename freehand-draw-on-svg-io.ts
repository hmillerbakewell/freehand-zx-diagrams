import Diagrams = require("./freehand-zx-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

export class FreehandOnSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
    takeInput: boolean
    currentPath: string
    paths: string[]
    accuracyScale: number
    svgElement: SVG.Container
    lastTimeTriggered: number
    mousePos: SVG.Point
    closingVertexDistance: number
    mousedown: (e: MouseEvent) => void = (e) => {
        var cursor = this.cursor(e)
        this.startPath();
        this.takeInput = true;
        this.addPoint(cursor.x, cursor.y);

    }
    mouseup: (e: MouseEvent) => void = (e) => {
        var cursor = this.cursor(e)

        this.addPoint(cursor.x, cursor.y);
        this.endPath();
        this.takeInput = false;
    }
    mousemove: (e: MouseEvent) => void = (e) => {
        var cursor = this.cursor(e)
        this.addPoint(cursor.x, cursor.y);

    }
    createSVG: (selector: string) => void = (selector: string) => {

        this.svgElement = SVG(selector).style("border: 1px solid black")
        this.svgElement.size(600, 600).viewbox(); // TODO viewbox

        // Mouse events
        this.svgElement.mousedown(this.mousedown);

        this.svgElement.mouseup(this.mouseup);

        this.svgElement.mousemove(this.mousemove);

    }
    cursor: (e: MouseEvent) => SVGPoint = (e) => {
        this.mousePos = new SVG.Point(e.clientX, e.clientY)
        if (this.svgElement) {
            let transcribedPoint = this.mousePos.transform(this.svgElement.screenCTM().inverse())
            return transcribedPoint.native();
        } else {
            return this.mousePos.native()
        }
    }
    constructor(targetDiagram: Diagrams.IDiagramInput) {
        super(targetDiagram)
        this.takeInput = false
        this.currentPath = ""
        this.paths = []
        this.accuracyScale = 1
        this.svgElement = null
        this.lastTimeTriggered = (new Date()).getMilliseconds()
        this.mousePos = new SVG.Point(0, 0)
        this.closingVertexDistance = 10
    }
    addPoint: (x: number, y: number) => void = (x: number, y: number) => {
        this.lastTimeTriggered = (new Date()).getMilliseconds()
        if (this.takeInput) {
            var round = function (x, accuracy) {
                return Math.round(x * accuracy) / accuracy;
            }
            var s = this.currentPath.length === 0 ? "M" : "L";
            s += round(x, this.accuracyScale);
            s += ", ";
            s += round(y, this.accuracyScale);
            s += " ";
            this.currentPath += s;
            this.svgElement.path(this.currentPath).stroke("black").fill("transparent");
        }
    }
    startPath: () => void = () => {
        this.currentPath = "";
    }
    endPath: () => void = () => {
        var s = this.currentPath;
        this.paths.push(s);
        this.currentPath = "";
        this.takeInput = false
        this.drawAllShapes();
        if (this._targetDiagram) {
            var pathAsObj = this.pathToObject(s)
            if (pathAsObj.type === "Edge") {
                this._targetDiagram.importEdge(<Diagrams.Edge>pathAsObj)
            } else if (pathAsObj.type === "Vertex") {
                this._targetDiagram.importVertex(<Diagrams.Vertex>pathAsObj)
            }
        }
    }
    pathToObject: (pathAsString: string) => (Diagrams.Edge | Diagrams.Vertex | null) = (pathAsString: string) => {
        pathAsString = pathAsString
            .replace(/[a-zA-Z]/g, '')
            .replace(/[\s,]+/g, ' ')
            .trim()
        var interpolatedPath = pathInterpolate(pathAsString, Diagrams._diagramOptions.interpolationDistance)
        if (interpolatedPath.length > 10) {
            var dO = new Diagrams.DrawnObject()
            dO.start = interpolatedPath.start
            dO.end = interpolatedPath.end
            dO.length = interpolatedPath.length
            dO.bbox = interpolatedPath.bbox
            dO.waypoints = interpolatedPath.waypoints

            var pathAsPositions = pathToPosnList(interpolatedPath.waypoints)
            var itIsAnEdge = true
            // Is it closed?
            var start = { x: interpolatedPath.start[0], y: interpolatedPath.start[1] }
            var end = { x: interpolatedPath.end[0], y: interpolatedPath.end[1] }
            if (Diagrams.posnDistanceSquared(start, end) < Math.pow(this.closingVertexDistance, 2)) {
                itIsAnEdge = false
            }
            var r: (Diagrams.Edge | Diagrams.Vertex) // result
            if (itIsAnEdge) {
                r = new Diagrams.Edge(start, end)
            } else {
                var midpointX = interpolatedPath.bbox[0] + (interpolatedPath.bbox[2] / 2)
                var midpointY = interpolatedPath.bbox[1] + (interpolatedPath.bbox[3] / 2)
                r = new Diagrams.Vertex({ x: midpointX, y: midpointY })
            }
            r.drawn = dO
            return r
        } else {
            return null
        }
    }
    drawAllShapes = () => {
        var svg = this.svgElement;
        svg.clear();
        for (var shape in this.paths) {
            var pathDrawn = this.paths[shape];
            if (pathDrawn !== null && pathDrawn.length > 0) {
                svg.path(pathDrawn).stroke("black").fill("transparent");
            }
        }
    }
}

function pathToPosnList(path: number[][]) {
    var posnList = []
    for (var i = 0; i < path.length; i++) {
        posnList.push({ x: path[i][0], y: path[i][1] })
    }
    return posnList
}
