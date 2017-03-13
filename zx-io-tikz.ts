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

var edgeStyleLookup: { [id: number]: string } = {}
edgeStyleLookup[EDGESTYLES.PLAIN] = "-"
var nodeStyleLookup: { [id: number]: string } = {}
nodeStyleLookup[NODESTYLES.GREENNODE] = "gn"
nodeStyleLookup[NODESTYLES.REDNODE] = "rn"
nodeStyleLookup[NODESTYLES.INPUTOUTPUT] = "none"
nodeStyleLookup[NODESTYLES.WIRE] = "none"
nodeStyleLookup[NODESTYLES.HADAMARD] = "H"
nodeStyleLookup[NODESTYLES.BOX] = "block"
nodeStyleLookup[NODESTYLES.NONE] = "none"

var styleNodeLookup: { [id: string]: NODESTYLES } = {}
styleNodeLookup["plain"] = NODESTYLES.NONE
styleNodeLookup["H"] = NODESTYLES.HADAMARD
styleNodeLookup["none"] = NODESTYLES.NONE
styleNodeLookup["block"] = NODESTYLES.NONE
styleNodeLookup["gn"] = NODESTYLES.GREENNODE
styleNodeLookup["rn"] = NODESTYLES.REDNODE

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
        let style = nodeStyleLookup[node.style]
        let label = node.label.length > 0 ? `$${node.label}$` : ""
        s += `\t\\node [style=${style}] (${node.reference}) `
        s += `at (${node.position.x}, ${node.position.y})   {${label}};`
        s += '\n'
    }
    s += `\\end{pgfonlayer}` + '\n'
    s += `\\begin{pgfonlayer} {edgelayer}` + '\n'
    for (let edge of edgeList) {
        let style = edgeStyleLookup[edge.style]
        s += `\t\\draw[-] (${edge.start}) to (${edge.end});` + '\n'
    }
    s += `\\end{pgfonlayer}` + '\n'
    return s
}

export function TikZtoZX(inputString: string) {
    let d = new Diagrams.Diagram()
    // Gather all the nodes:
    let regNodeMatch = /\\node\s*\[style=(.*)\]\s*\((.*)\)\s*at\s*\((.*)\s*,\s*(.*)\)\s*{(.*)}\s*;/gim
    let nodeMatches = regNodeMatch.exec(inputString)
    while (nodeMatches != null) {
        let style = nodeMatches[1]
        let id = nodeMatches[2]
        let pos = {
            x: parseFloat(nodeMatches[3]),
            y: parseFloat(nodeMatches[4])
        }
        let label = nodeMatches[5]
        let v = new Diagrams.Vertex(pos)
        v.id = id
        let data: ZXIO.IVertexData = {
            label: label,
            type: ZX.VERTEXTYPES.Z,
            radius: ZXIO.defaultRadius
        }
        switch (styleNodeLookup[style]) {
            case NODESTYLES.BOX:
            case NODESTYLES.HADAMARD:
                data.type = ZX.VERTEXTYPES.HADAMARD
                break;
            case NODESTYLES.INPUTOUTPUT:
                data.type = ZX.VERTEXTYPES.INPUT
                break;
            case NODESTYLES.GREENNODE:
                data.type = ZX.VERTEXTYPES.Z
                break;
            case NODESTYLES.REDNODE:
                data.type = ZX.VERTEXTYPES.X
                break;
            case NODESTYLES.NONE:
            case NODESTYLES.WIRE:
                data.type = ZX.VERTEXTYPES.WIRE
                break;
        }
        v.data = data
        d.importVertex(v)
        nodeMatches = regNodeMatch.exec(inputString)
    }
    let regEdgeMatch = /\\draw\s*\[(.*)\]\s*\((.*)\)\s*to\s*\((.*)\)\s*;/gim
    let edgeMatches = regEdgeMatch.exec(inputString)
    while (edgeMatches != null) {
        let style = edgeMatches[1]
        let start = edgeMatches[2]
        let end = edgeMatches[3]
        let startVertex = d.vertexById[start]
        let endVertex = d.vertexById[end]
        let e = new Diagrams.Edge(startVertex, endVertex)
        let data: ZXIO.IEdgeData = {
            type: ZX.EDGETYPES.PLAIN,
            RDPWaypoints: [startVertex.pos, endVertex.pos],
            path: ""
        }
        e.data = data
        d.importEdge(e)
        edgeMatches = regEdgeMatch.exec(inputString)
    }
    return d
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
        var packetDiagram: Diagrams.Diagram
        var inputString: string
        try {
            inputString = $(this.UISelector).val()
            packetDiagram = TikZtoZX(inputString)
            this.outputDiagram.importRewriteDiagram(packetDiagram)
        } catch (e) {
            // TODO flag when TikZ is invalid
        }

    }
}
