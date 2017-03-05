import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

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
    SVG: SVG.Container
    toZXSVG() {
        if (this.SVG) {
            var svg = this.SVG
            svg.size(500, 500)
            svg.clear()
            var s = ""
            //First user-created vertices
            var coloursDict: { [id: string]: string } = {}
            coloursDict["X"] = "red"
            coloursDict["Z"] = "green"
            for (var vertex of this.targetDiagram.vertices) {
                var c = svg.circle(10)
                c.cx(vertex.pos.x)
                c.cy(vertex.pos.y)
                if (!vertex.data || vertex.data == "") {
                    vertex.data = "X"
                }
                c.fill(coloursDict[vertex.data[0]])
            }

            //Now count the degree of each inferred vertex
            var degreeById: { [id: string]: number } = {}
            let inc = id => (degreeById[id] = degreeById[id] ? degreeById[id] + 1 : 1)
            for (edge of this.targetDiagram.edges) {
                inc(edge.start.vertex.id)
                inc(edge.end.vertex.id)
            }
            //Then inferred vertices
            for (var vertex of this.targetDiagram.inferredVertices) {
                var vertexType = ""
                var degree = (degreeById[vertex.id] || 0)
                switch (degree) {
                    case 0:
                        vertexType = "orphan"
                        break;
                    case 1:
                        vertexType = "input"
                        var r = svg.rect(10, 10)
                        r.x(vertex.pos.x - 5)
                        r.y(vertex.pos.y - 5)
                        break;
                    case 2:
                        vertexType = "wire"
                        break;
                    default:
                        vertexType = "error"
                        break;
                }
            }
            //Then edges
            for (var edge of this.targetDiagram.edges) {
                var pathCommand = ""
                pathCommand += `M${edge.start.vertex.pos.x} ${edge.start.vertex.pos.y} `
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
                    normaliseAndPushToTangents(waypoints[0].x - edge.start.pos.x, waypoints[0].y - edge.start.pos.y)
                    // waypoint i -> waypoint i+1

                    for (var i = 1; i < waypoints.length - 1; i++) {
                        normaliseAndPushToTangents(waypoints[i + 1].x - waypoints[i - 1].x, waypoints[i + 1].y - waypoints[i - 1].y)
                    }
                    // waypoint last -> vertex end
                    normaliseAndPushToTangents(edge.end.pos.x - waypoints[i].x, edge.end.pos.y - waypoints[i].y)

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
                    pathCommand += `L ${edge.end.pos.x} ${edge.end.pos.y} `

                }
                svg.path(pathCommand)
                    .fill("transparent")
                    .stroke("black")
            }
        }
    }
}
