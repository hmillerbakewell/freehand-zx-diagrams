import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import ZX = require("./theory-ZX.js")

let quantoVertexLabels: { [id: number]: string } = {}
quantoVertexLabels[ZX.VERTEXTYPES.WIRE] = "wire"
quantoVertexLabels[ZX.VERTEXTYPES.HADAMARD] = "hadamard"
quantoVertexLabels[ZX.VERTEXTYPES.INPUT] = "i"
quantoVertexLabels[ZX.VERTEXTYPES.OUTPUT] = "o"
quantoVertexLabels[ZX.VERTEXTYPES.X] = "X"
quantoVertexLabels[ZX.VERTEXTYPES.Z] = "Z"

let quantoEdgeLabels: { [id: number]: string } = {}
quantoEdgeLabels[ZX.EDGETYPES.PLAIN] = ""


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
        // Loop through vertices, act according the existing vertex.type data
        for (var vertex of this.targetDiagram.vertices) {
            if (vertex.data && vertex.data.type) {
                switch (vertex.data.type) {
                    case ZX.VERTEXTYPES.WIRE:
                        output.wire_vertices[vertex.id] = {
                            "annotation": {
                                "boundary": false,
                                "coord": [vertex.pos.x, vertex.pos.y]
                            }
                        }
                        break;
                    case ZX.VERTEXTYPES.INPUT:
                    case ZX.VERTEXTYPES.OUTPUT:
                        output.wire_vertices[vertex.id] = {
                            "annotation": {
                                "boundary": true,
                                "coord": [vertex.pos.x, vertex.pos.y]
                            }
                        }
                        break;

                    case ZX.VERTEXTYPES.X:
                    case ZX.VERTEXTYPES.Z:
                    case ZX.VERTEXTYPES.HADAMARD:
                        output.node_vertices[vertex.id] = {
                            "data": {
                                "type": quantoVertexLabels[vertex.data.type],
                                "value": (vertex.data.label || "")
                            },
                            "annotation": {
                                "coord": [vertex.pos.x, vertex.pos.y]
                            }
                        }
                        break;

                }
            } else {
                output.wire_vertices[vertex.id] = {
                    "annotation": {
                        "boundary": false,
                        "coord": [vertex.pos.x, vertex.pos.y]
                    }
                }
                break;
            }
        }

        // Then edges
        for (var edge of this.targetDiagram.edges) {
            output.undir_edges[edge.id] = {
                src: edge.start.vertex.id,
                tgt: edge.end.vertex.id
            }
        }
        return JSON.stringify(output)
    }
}