import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")

export class ZXJSONIOModule extends DiagramIO.DiagramIOHTMLModule {
    targetDiagram: Diagrams.Diagram
    constructor(targetDiagram: Diagrams.Diagram) {
        super(targetDiagram)
        this.upstreamChange = this.onDiagramChange
        this.targetDiagram.subscribe(this)
    }
    onDiagramChange() {
        $(this.UISelector).html(JSON.stringify(JSON.parse(this.toSimpleZXGraph()), undefined, 2))
    }
    toSimpleZXGraph() {
        var output = {
            node_vertices: {},
            undir_edges: {},
            wire_vertices: {}
        }
        //First user-created vertices
        for (var vertex of this.targetDiagram.vertices) {
            output.node_vertices[vertex.id] = {
                "data": {
                    "type": "X",
                    "value": ""
                },
                "annotation": {
                    "coord": [vertex.pos.x, vertex.pos.y]
                }
            }
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
                    break;
                case 2:
                    vertexType = "wire"
                    break;
                default:
                    vertexType = "error"
                    break;
            }

            output.wire_vertices[vertex.id] = {
                "annotation": {
                    "boundary": (degree === 1),
                    "coord": [vertex.pos.x, vertex.pos.y]
                }
            }
        }
        //Then edges
        for (var edge of this.targetDiagram.edges) {
            output.undir_edges[edge.id] = {
                src: edge.start.vertex.id,
                tgt: edge.end.vertex.id
            }
        }
        return JSON.stringify(output)
    }
}