import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import RDP = require("./RamerDouglasPeucker.js")
import ZX = require("./theory-ZX.js")

export class FreehandOnSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
    takeInput: boolean
    currentPath: string
    paths: string[]
    accuracyScale: number
    svgElement: SVG.Container
    lastTimeTriggered: number
    mousePos: SVG.Point
    closingVertexDistance: number = 20
    closingEdgeEdgeDistance: number = 20
    closingEdgeVertexDistance: number = 20

    virtualDiagram: Diagrams.Diagram

    // Mouse Events

    mousedown: (e: MouseEvent) => void = (e) => {
        e.preventDefault()
        var cursor = this.cursor(e)
        this.startPath();
        this.takeInput = true;
        this.addPoint(cursor.x, cursor.y);

    }
    mouseup: (e: MouseEvent) => void = (e) => {
        e.preventDefault()
        var cursor = this.cursor(e)

        this.addPoint(cursor.x, cursor.y);
        this.endPath();
        this.takeInput = false;
    }
    mousemove: (e: MouseEvent) => void = (e) => {
        e.preventDefault()
        var cursor = this.cursor(e)
        this.addPoint(cursor.x, cursor.y);

    }


    createSVG: (selector: string) => void = (selector: string) => {
        this.svgElement = SVG(selector).style("border: 1px solid black")
        this.svgElement.size(500, 500).viewbox(); // TODO viewbox

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
        this.virtualDiagram = new Diagrams.Diagram()
        this.inferredVertices = []
        this.unpluggedVertexGaps = []
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
        // Update the private virtual diagram
        if (this.virtualDiagram) {
            var pathAsObj = this.pathToObject(s)
            if (pathAsObj !== null) {
                if (pathAsObj.type === "Edge") {
                    this.virtualDiagram.importEdge(<Diagrams.Edge>pathAsObj)
                } else if (pathAsObj.type === "Vertex") {
                    this.virtualDiagram.importVertex(<Diagrams.Vertex>pathAsObj)
                }
            }
        }
        // Try and tie up loose edges, etc. in the virtual diagram
        this.fillVertexGaps()

        // Create another dummy diagram
        // This is the one we will send off
        var packageDiagram = new Diagrams.Diagram()
        packageDiagram.importRewriteDiagram(this.virtualDiagram)
        for (var i = 0; i < this.inferredVertices.length; i++) {
            packageDiagram.importVertex(this.inferredVertices[i])
        }
        this.inferredVertices = []
        this._targetDiagram.importRewriteDiagram(packageDiagram)
    }
    pathToObject: (pathAsString: string) => (Diagrams.Edge | Diagrams.Vertex | null) = (pathAsString: string) => {
        pathAsString = pathAsString
            .replace(/[a-zA-Z]/g, '')
            .replace(/[\s,]+/g, ' ')
            .trim()
        var interpolatedPath = pathInterpolate(pathAsString, Diagrams._diagramOptions.interpolationDistance)
        var RDPWaypoints = RDP.RamerDouglasPeucker(interpolatedPath.waypoints, 20).concat([interpolatedPath.end])
        if (interpolatedPath.length > 10) {

            var pathAsPositions = pathToPosnList(RDPWaypoints)
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
                var edata: DiagramIO.IFreehandOnSVGEdge & ZX.IEdgeData = {
                    type: ZX.EDGETYPES.PLAIN,
                    RDPWaypoints: pathToPosnList(RDPWaypoints)
                }
                r.data = edata
            } else {
                var midpointX = interpolatedPath.bbox[0] + (interpolatedPath.bbox[2] / 2)
                var midpointY = interpolatedPath.bbox[1] + (interpolatedPath.bbox[3] / 2)
                r = new Diagrams.Vertex({ x: midpointX, y: midpointY })
                var vdata: ZX.IVertexData = {
                    type: ZX.VERTEXTYPES.X,
                    label: ""
                }
                r.data = vdata
            }
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

    // Joining edges and vertices

    inferredVertices: Diagrams.Vertex[]
    private unpluggedVertexGaps: Diagrams.VertexGap[]
    private refreshGapList() {
        this.unpluggedVertexGaps = []
        for (var edge of this.virtualDiagram.edges) {
            if (edge.start.vertex === null) {
                this.unpluggedVertexGaps.push(edge.start)
            }
            if (edge.end.vertex === null) {
                this.unpluggedVertexGaps.push(edge.end)
            }
        }
    }
    private emptyVertexGaps() {
        for (var gap of this.unpluggedVertexGaps) {
            gap.vertex = null
        }
        this.inferredVertices = []
    }
    private fillVertexGaps() {
        //First get list of vertexGaps
        this.emptyVertexGaps()
        this.refreshGapList()
        // For each vertexGap compare distances to each vertex
        for (var gap of this.unpluggedVertexGaps) {
            var closestDist = Math.pow(this.closingEdgeVertexDistance, 2) + 1
            var dist = 0
            for (var vx of this.virtualDiagram.vertices) {
                dist = Diagrams.posnDistanceSquared(gap.pos, vx.pos)
                if (dist < closestDist) {
                    closestDist = dist
                    // Claim closest valid vertex
                    gap.vertex = vx
                }
            }
        }
        this.refreshGapList()
        dist = 0
        // For each remaining vertexGap, compare to other vertexGaps
        for (var i = 0; i < this.unpluggedVertexGaps.length; i++) {
            var closestDist = Math.pow(this.closingEdgeEdgeDistance, 2) + 1
            var gap1 = this.unpluggedVertexGaps[i]
            for (var j = i + 1; j < this.unpluggedVertexGaps.length; j++) {
                var gap2 = this.unpluggedVertexGaps[j]
                // Check they are not already filled
                if (gap1.vertex === null && gap2.vertex === null) {
                    dist = Diagrams.posnDistanceSquared(gap1.pos, gap2.pos)
                    if (dist < closestDist) {
                        closestDist = dist
                        // Claim closest valid vertex
                        var midpoint = [interpolate(0.5, gap1.pos.x, gap2.pos.x), interpolate(0.5, gap1.pos.y, gap2.pos.y)]
                        var vx = new Diagrams.Vertex({ x: midpoint[0], y: midpoint[1] })
                        var wdata: ZX.IVertexData = {
                            type: ZX.VERTEXTYPES.WIRE,
                            label: ""
                        }
                        this.inferredVertices.push(vx)
                        gap1.vertex = vx
                        gap2.vertex = vx
                    }
                }
            }
            // If, at the end, no other vertexGaps were close, then create a new vertex.
            if (gap1.vertex === null) {
                var vx = new Diagrams.Vertex(gap1.pos)
                var vdata: ZX.IVertexData = {
                    type: ZX.VERTEXTYPES.INPUT,
                    label: ""
                }
                vx.data = vdata
                gap1.vertex = vx
                this.inferredVertices.push(vx)
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


function interpolate(lambda: number, a: number, b: number) {
    return ((1 - lambda) * a + lambda * b)
}