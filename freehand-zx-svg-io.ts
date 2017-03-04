import Diagrams = require("./freehand-zx-diagrams.js")
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
            svg.size(600, 600)
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
                var posns = [edge.start.vertex.pos.x,
                edge.start.vertex.pos.y,
                edge.end.vertex.pos.x,
                edge.end.vertex.pos.y]
                svg.path(`M${posns[0]},${posns[1]} L${posns[2]},${posns[3]}`)
                    .fill("transparent")
                    .stroke("black")
            }
        }
    }
}