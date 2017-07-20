import Diagrams = require("./diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("./path-interpolate")
import $ = require("jquery")
import ZX = require("./zx-theory.js")
import ZXIO = require("./zx-io.js")

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

/** Edges as specified by Quantomatic */
export interface IQuantoEdge {
    src: string
    tgt: string
}

/** Nodes as specified by Quantomatic */
export interface IQuantoNodeVertex {
    data: {
        type: string,
        value: string
    }
    annotation: {
        boundary: boolean,
        coord: [number, number]
    }
}

/** Wires as specified by Quantomatic */
export interface IQuantoWireVertex {
    annotation: {
        boundary: boolean,
        coord: [number, number]
    }
}

/** Diagrams as specified by Quantomatic */
export interface IQuantoDiagram {
    wire_vertices: { [index: string]: IQuantoWireVertex }
    node_vertices: { [index: string]: IQuantoNodeVertex }
    undir_edges: { [index: string]: IQuantoEdge }
}

/** IO module that interprets Quantomatic's JSON */
export class ZXJSONIOModule extends ZXIO.HTMLModule {
    constructor() {
        super()
    }

    /** Rewrite the internal diagram data */
    importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        $(this.UISelector).val(
            JSON.stringify(
                JSON.parse(diagramToQuantoGraph(diagram))
                , undefined, 2)
        )
    }

    /** Fires when the JSON has been changed */
    onJSONChange: () => void = () => {
        var parsed: any
        try {
            parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            var packetDiagram = new Diagrams.Diagram()
            let vertexLookup:
                { [id: string]: Diagrams.Vertex } = {}
            for (let wireVertexName in parsed.wire_vertices) {
                let wireVertex: IQuantoWireVertex = parsed.wire_vertices[wireVertexName]
                var coordArr = wireVertex.annotation.coord
                var coord = {
                    x: coordArr[0],
                    y: coordArr[1]
                }
                let dummyVertex = new Diagrams.Vertex(coord)
                dummyVertex.pos = coord
                if (wireVertex.annotation.boundary) {
                    dummyVertex.data.type = ZX.VERTEXTYPES.WIRE
                } else {
                    dummyVertex.data.type = ZX.VERTEXTYPES.INPUT
                }
                packetDiagram.importVertex(dummyVertex)
                vertexLookup[wireVertexName] = dummyVertex
            }

            for (let nodeVertexName in parsed.node_vertices) {
                let nodeVertex: IQuantoNodeVertex = parsed.node_vertices[nodeVertexName]
                var coordArr = nodeVertex.annotation.coord
                var coord = {
                    x: coordArr[0],
                    y: coordArr[1]
                }
                let dummyVertex = new Diagrams.Vertex(coord)
                dummyVertex.pos = coord
                dummyVertex.id = nodeVertexName
                let data: ZX.IVertexData = {
                    type: vertexQuantoLabels[nodeVertex.data.type],
                    label: nodeVertex.data.value
                }
                dummyVertex.data = data
                packetDiagram.importVertex(dummyVertex)
                vertexLookup[nodeVertexName] = dummyVertex
            }

            for (let edgeName in parsed.undir_edges) {
                let edge: IQuantoEdge = parsed.undir_edges[edgeName]
                let sourceVertex = vertexLookup[edge.src]
                let targetVertex = vertexLookup[edge.tgt]

                let dummyEdge = new Diagrams.Edge(sourceVertex, targetVertex)
                let data: ZXIO.IEdgeData = {
                    RDPWaypoints: [sourceVertex.pos, targetVertex.pos],
                    type: ZX.EDGETYPES.PLAIN,
                    path: null
                }
                dummyEdge.data = data
                dummyEdge.id = edgeName
                packetDiagram.importEdge(dummyEdge)
            }
            this.outputDiagram.importRewriteDiagram(packetDiagram)
        }
    }


}

/** Converts a given diagram to Quantomatic-understandable JSON */
let diagramToQuantoGraph = function (diagram: Diagrams.IDiagramOutput) {
    var output = <IQuantoDiagram>{
        node_vertices: {},
        undir_edges: {},
        wire_vertices: {}
    }
    // Loop through vertices, act according to the existing vertex.type data
    for (var vertex of diagram.vertices) {
        if (vertex.data) {
            switch (vertex.data.type) {
                case ZX.VERTEXTYPES.WIRE:
                    output.wire_vertices[vertex.id] = <IQuantoWireVertex>{
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
                            "boundary": false,
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
    for (var edge of diagram.edges) {
        output.undir_edges[edge.id] = {
            src: edge.start,
            tgt: edge.end
        }
    }
    return JSON.stringify(output)
}
