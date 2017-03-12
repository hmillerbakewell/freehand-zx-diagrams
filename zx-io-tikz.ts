import Diagrams = require("./diagrams.js")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import ZX = require("./zx-theory.js")
import ZXIO = require("./zx-io.js")

/* Example
\begin{tikzpicture}
	\begin{pgfonlayer}{nodelayer}
		\node [style=none] (i1)   at (0, 1.5)   {};
		\node [style=gn] (h1)   at (0,1)   {$\pi/2$};
		\node [style=rn] (h)   at (0,0)   {};
		\node [style=gn] (h2)   at (1.5,1)   {$-\pi/2$};
		\node [style=gn] (h3)   at (0,-1)   {$\pi/2$};
		\node [style=none] (o3)   at (0, -1.5)   {};
	\end{pgfonlayer}
	\begin{pgfonlayer}{edgelayer}
		\draw [-] (o3) to (i1);
		\draw [-] (h) to (h2);
	\end{pgfonlayer}
	\end{tikzpicture}

    */

interface ITikZNode {
    style: NODESTYLES,
    reference: string,
    position: ZXIO.ICoord,
    label: string
}
interface ITikZEdge {
    style: EDGESTYLES,
    start: string,
    end: string
}

enum NODESTYLES { GREENNODE, REDNODE, INPUTOUTPUT, WIRE, HADAMARD, BOX, NONE }
enum EDGESTYLES { PLAIN }

var styleEdgeLookup: { [id: number]: string } = {}
styleEdgeLookup[EDGESTYLES.PLAIN] = "-"
var styleNodeLookup: { [id: number]: string } = {}
styleNodeLookup[NODESTYLES.GREENNODE] = "gn"
styleNodeLookup[NODESTYLES.REDNODE] = "rn"
styleNodeLookup[NODESTYLES.INPUTOUTPUT] = "none"
styleNodeLookup[NODESTYLES.WIRE] = "none"
styleNodeLookup[NODESTYLES.HADAMARD] = "H"
styleNodeLookup[NODESTYLES.BOX] = "block"
styleNodeLookup[NODESTYLES.NONE] = "none"

export function ZXToTikZ(diagram: Diagrams.IDiagramOutput) {
    var s = ""
    let nodeList: ITikZNode[] = []
    let edgeList: ITikZEdge[] = []
    for (let vertex of diagram.vertices) {
        let data = <ZX.IVertexData>vertex.data
        let node: ITikZNode = {
            style: NODESTYLES.GREENNODE,
            reference: vertex.id,
            position: vertex.pos,
            label: data.label || ""
        }
        switch (data.type) {
            case ZX.VERTEXTYPES.INPUT:
            case ZX.VERTEXTYPES.OUTPUT:
                node.style = NODESTYLES.INPUTOUTPUT
                break;
            case ZX.VERTEXTYPES.HADAMARD:
                // currently we assume that no label means Hadamard
                // if there is a label then we assume they meant something else
                // This is not true for qutrit
                if (node.label === "") {
                    node.style = NODESTYLES.HADAMARD
                } else {
                    node.style = NODESTYLES.BOX
                }
                break;
            case ZX.VERTEXTYPES.X:
                node.style = NODESTYLES.REDNODE
                break;
            case ZX.VERTEXTYPES.Z:
                node.style = NODESTYLES.GREENNODE
                break;
            case ZX.VERTEXTYPES.WIRE:
                node.style = NODESTYLES.NONE
                break;
        }
        nodeList.push(node)
    }
    for (let edge of diagram.edges) {
        let data = <ZX.IEdgeData>edge.data
        let tikZedge: ITikZEdge = {
            style: EDGESTYLES.PLAIN,
            start: edge.start,
            end: edge.end
        }
        edgeList.push(tikZedge)
    }
    s += `\\begin{pgfonlayer}{nodelayer}` + '\n'
    for (let node of nodeList) {
        let style = styleNodeLookup[node.style]
        let label = node.label.length > 0 ? `$${node.label}$` : ""
        s += `\t\\node [style=${style}] (${node.reference}) `
        s += `at (${node.position.x}, ${node.position.y})   {${label}};`
        s += '\n'
    }
    s += `\\end{pgfonlayer}` + '\n'
    s += `\\begin{pgfonlayer} {edgelayer}` + '\n'
    for (let edge of edgeList) {
        let style = styleEdgeLookup[edge.style]
        s += `\t\\draw[-] (${edge.start}) to (${edge.end});` + '\n'
    }
    s += `\\end{pgfonlayer}` + '\n'
    return s
}


export class ZXTikZIOModule extends ZXIO.HTMLModule {
    constructor() {
        super()
    }
    importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
    = (diagram) => {
        $(this.UISelector).html(
            ZXToTikZ(diagram)
        )
    }
    onJSONChange: () => void = () => {
        var parsed: any
        try {
            //parsed = JSON.parse($(this.UISelector).val())
        } catch (e) {
            // TODO flag when JSON is invalid
        }
        if (parsed) {
            /*
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
            */
        }
    }
}