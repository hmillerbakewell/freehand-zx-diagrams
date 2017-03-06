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

let vertexQuantoLabels: { [id: string]: number } = {}
vertexQuantoLabels["wire"] = ZX.VERTEXTYPES.WIRE
vertexQuantoLabels["hadamard"] = ZX.VERTEXTYPES.HADAMARD
vertexQuantoLabels["i"] = ZX.VERTEXTYPES.INPUT
vertexQuantoLabels["o"] = ZX.VERTEXTYPES.OUTPUT
vertexQuantoLabels["X"] = ZX.VERTEXTYPES.X
vertexQuantoLabels["Z"] = ZX.VERTEXTYPES.Z


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
    onJSONChange: () => void = () => {
        var parsed: any
        try {
            parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            var dummyDiagram = new Diagrams.Diagram()
            let vertexPosLookup: { [id: string]: Diagrams.IDiagramPosition } = {}
            for (let wireVertexName in parsed.wire_vertices) {
                let wireVertex = parsed.wire_vertices[wireVertexName]
                var coordArr = wireVertex.annotation.coord
                var coord = { x: parseFloat(coordArr[0]), y: parseFloat(coordArr[1]) }
                vertexPosLookup[wireVertexName] = coord
                let dummyVertex = new Diagrams.Vertex(coord)
                dummyVertex.pos = coord
                if (wireVertex.annotation.boundary) {
                    dummyVertex.data.type = ZX.VERTEXTYPES.WIRE
                } else {
                    dummyVertex.data.type = ZX.VERTEXTYPES.INPUT
                }
                dummyDiagram.importVertex(dummyVertex)
            }

            for (let nodeVertexName in parsed.node_vertices) {
                let nodeVertex = parsed.node_vertices[nodeVertexName]
                var coordArr = nodeVertex.annotation.coord
                var coord = { x: parseFloat(coordArr[0]), y: parseFloat(coordArr[1]) }
                vertexPosLookup[nodeVertexName] = coord
                let dummyVertex = new Diagrams.Vertex({ x: parseFloat(coord[0]), y: parseFloat(coord[1]) })
                dummyVertex.pos = coord
                dummyVertex.id = nodeVertexName
                dummyVertex.data.type = vertexQuantoLabels[nodeVertex.data.type]
                dummyVertex.data.label = nodeVertex.data.value
                dummyDiagram.importVertex(dummyVertex)
            }

            for (let edgeName of parsed.undir_edges) {
                let edge = parsed.undir_edges[edgeName]
                let sourceVertexPos = vertexPosLookup[edge.src]
                let targetVertexPos = vertexPosLookup[edge.tgt]

                let dummyEdge = new Diagrams.Edge(sourceVertexPos, targetVertexPos)
                dummyEdge.id = edgeName
                dummyDiagram.importEdge(dummyEdge)
            }
            this.targetDiagram.importRewriteDiagram(dummyDiagram)
        }
    }
    toSimpleZXGraph() {
        var output = {
            node_vertices: {},
            undir_edges: {},
            wire_vertices: {}
        }
        // Loop through vertices, act according to the existing vertex.type data
        for (var vertex of this.targetDiagram.vertices) {
            if (vertex.data) {
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