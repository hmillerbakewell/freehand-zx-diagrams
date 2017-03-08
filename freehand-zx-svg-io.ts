import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import ZX = require("./theory-ZX.js")

export class ZXSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
    targetDiagram: Diagrams.Diagram
    constructor(targetDiagram: Diagrams.Diagram) {
        super(targetDiagram)
        this.upstreamChange = this.onDiagramChange
        this.targetDiagram.subscribe(this)
    }
    onDiagramChange() {
        this.toZXSVG()
    }
    clickedElement: (e: MouseEvent) => void = (e) => {
        e.preventDefault()
        if ((<any>e.srcElement).dataset) {
            var clickedID = (<any>e.srcElement).dataset["id"]
        }
        if (clickedID) {
            var ele = this.idToElement[clickedID]
            if (ele.type === "Vertex") {
                var dv = <ZX.IVertexData>ele.data
                if (dv.type === ZX.VERTEXTYPES.Z) {
                    dv.type = ZX.VERTEXTYPES.X
                } else if (dv.type === ZX.VERTEXTYPES.X) {
                    dv.type = ZX.VERTEXTYPES.HADAMARD
                } else if (dv.type === ZX.VERTEXTYPES.HADAMARD) {
                    dv.type = ZX.VERTEXTYPES.Z
                }
                this._targetDiagram.fireChange()
            } else if (ele.type === "Edge") {

            }
        }
    }
    idToElement: { [index: string]: (Diagrams.Vertex | Diagrams.Edge) } = {}
    SVG: SVG.Container
    toZXSVG() {
        if (this.SVG) {
            var svg = this.SVG
            svg.size(500, 500).style("border: 1px solid black")
            svg.clear()
            var s = ""
            this.idToElement = {}

            // Edges
            for (var edge of this.targetDiagram.edges) {
                let startPos = this.targetDiagram.vertexByID[edge.start].pos
                let endPos = this.targetDiagram.vertexByID[edge.end].pos
                var pathCommand = ""
                pathCommand += `M${startPos.x} ${startPos.y} `
                if ((<DiagramIO.IFreehandOnSVGEdge>edge.data).RDPWaypoints) {
                    var smoothingFactor = 20
                    var tangents: Diagrams.IDiagramPosition[] = []
                    var normaliseAndPushToTangents = function (x: number, y: number) {

                        var tNorm: Diagrams.IDiagramPosition = {
                            x: 0,
                            y: 0
                        }
                        let d = 0
                        d = Math.pow(x * x + y * y, 0.5)
                        if (d > 0) {
                            tNorm = {
                                x: x / d,
                                y: y / d
                            }
                        }
                        tangents.push(tNorm)
                        return tNorm
                    }
                    var waypoints = (<DiagramIO.IFreehandOnSVGEdge>edge.data).RDPWaypoints
                    // Calculate tangents:
                    // vertex start -> waypoint 0
                    normaliseAndPushToTangents(waypoints[0].x - startPos.x, waypoints[0].y - startPos.y)
                    // waypoint i -> waypoint i+1

                    for (var i = 1; i < waypoints.length - 1; i++) {
                        normaliseAndPushToTangents(waypoints[i + 1].x - waypoints[i - 1].x, waypoints[i + 1].y - waypoints[i - 1].y)
                    }
                    // waypoint last -> vertex end
                    normaliseAndPushToTangents(endPos.x - waypoints[i].x, endPos.y - waypoints[i].y)

                    //Calculate path data:
                    // vertex start -> waypoint 0
                    pathCommand += `L ${waypoints[0].x} ${waypoints[0].y} `
                    // waypoint 0 -> waypoint 1
                    pathCommand += `C ${waypoints[0].x + tangents[0].x * smoothingFactor} ${waypoints[0].y + tangents[0].y * smoothingFactor}, `
                    pathCommand += `${waypoints[1].x - tangents[1].x * smoothingFactor} ${waypoints[1].y - tangents[1].y * smoothingFactor}, `
                    pathCommand += `${waypoints[1].x} ${waypoints[1].y} `
                    // waypoint i -> waypoint i+1
                    for (var i = 1; i < waypoints.length - 1; i++) {
                        pathCommand += `S ${waypoints[i + 1].x - tangents[i + 1].x * smoothingFactor} `
                        pathCommand += `${waypoints[i + 1].y - tangents[i + 1].y * smoothingFactor}, `
                        pathCommand += `${waypoints[i + 1].x} ${waypoints[i + 1].y} `
                    }
                    // waypoint last -> vertex end
                    pathCommand += `L ${endPos.x} ${endPos.y} `

                }
                svg.path(pathCommand)
                    .fill("transparent")
                    .stroke("black")
                    .data("type", (<ZX.IEdgeData>edge.data).type)
                    .data("id", edge.id)
                    .click(this.clickedElement)
                this.idToElement[edge.id] = edge
            }
            // Vertices
            var coloursDict: { [id: string]: string } = {}
            coloursDict[ZX.VERTEXTYPES.X] = "red"
            coloursDict[ZX.VERTEXTYPES.Z] = "green"
            coloursDict[ZX.VERTEXTYPES.HADAMARD] = "yellow"
            coloursDict[ZX.VERTEXTYPES.INPUT] = "black"
            coloursDict[ZX.VERTEXTYPES.OUTPUT] = "black"
            coloursDict[ZX.VERTEXTYPES.WIRE] = "grey"

            for (var vertex of this.targetDiagram.vertices) {
                if (vertex.data) {
                    var vdata = <ZX.IVertexData>vertex.data
                    switch (vdata.type) {
                        case ZX.VERTEXTYPES.INPUT:
                        case ZX.VERTEXTYPES.OUTPUT:
                        case ZX.VERTEXTYPES.WIRE:
                            var r = svg.rect(5, 5)
                            r.x(vertex.pos.x - 2.5)
                            r.y(vertex.pos.y - 2.5)
                            r.fill(coloursDict[vdata.type])
                                .data("type", (<ZX.IVertexData>vertex.data).type)
                                .data("id", vertex.id)
                                .click(this.clickedElement)
                            this.idToElement[vertex.id] = vertex
                            break;

                        case ZX.VERTEXTYPES.X:
                        case ZX.VERTEXTYPES.Z:
                            var c = svg.circle(10)
                            c.cx(vertex.pos.x)
                            c.cy(vertex.pos.y)
                            c.fill(coloursDict[vdata.type])
                                .data("type", (<ZX.IVertexData>vertex.data).type)
                                .data("id", vertex.id)
                                .click(this.clickedElement)
                                .stroke({ color: "black", width: 1 })
                            this.idToElement[vertex.id] = vertex
                            break;
                        case ZX.VERTEXTYPES.HADAMARD:
                            var r = svg.rect(10, 10)
                            r.x(vertex.pos.x - 5)
                            r.y(vertex.pos.y - 5)
                            r.fill(coloursDict[vdata.type])
                                .data("type", (<ZX.IVertexData>vertex.data).type)
                                .data("id", vertex.id)
                                .click(this.clickedElement)
                                .stroke({ color: "black", width: 1 })
                            this.idToElement[vertex.id] = vertex
                            break;
                    }
                }
            }
        }
    }
}
