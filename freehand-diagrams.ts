import pathInterpolate = require("path-interpolate")
import shortid = require("shortid")
import SVG = require("svgjs")


shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£')
export abstract class uID {
  protected _id: string
  constructor() {
    this._id = shortid.generate()
    //idLookup[this.id] = this
  }
  get id() {
    return this._id
  }
}

//export var idLookup: { [id: string]: any } = []

export class DiagramOptions {
  interpolationDistance: number
  closingEdgeLoopDistance: number
  closingEdgeVertexDistance: number
  closingEdgeEdgeDistance: number
}
export let _diagramOptions = new DiagramOptions()
_diagramOptions.interpolationDistance = 10
_diagramOptions.closingEdgeLoopDistance = 20
_diagramOptions.closingEdgeVertexDistance = 20
_diagramOptions.closingEdgeEdgeDistance = 20

export abstract class TypedId extends uID {
  protected _type: string
  constructor() {
    super()
    // If you see this, then you didn't set a new type in the constructor
    this._type = "TypedId"
  }
  get type() {
    return this._type
  }
}

export class DrawnObject extends TypedId {
  start: number[]
  end: number[]
  length: number
  bbox: number[]
  waypoints: number[][]
  constructor() {
    super()
    this._type = "DrawnObject"
  }
}

export interface IDiagramPosition {
  x: number
  y: number
}

function interpolate(lambda: number, a: number, b: number) {
  return ((1 - lambda) * a + lambda * b)
}

export function posnDistanceSquared(a: IDiagramPosition, b: IDiagramPosition) {
  var dx = a.x - b.x
  var dy = a.y - b.y
  return dx * dx + dy * dy
}

export class Vertex extends TypedId {
  pos: IDiagramPosition
  data: string
  drawn: DrawnObject | null
  constructor(pos: IDiagramPosition) {
    super()
    this.pos = pos
    this.data = ""
    this.drawn = null
    this._type = "Vertex"
  }
}

export class Edge extends TypedId {
  start: VertexGap
  end: VertexGap
  data: string
  drawn: DrawnObject | null
  constructor(start: IDiagramPosition, end: IDiagramPosition) {
    super()
    this.start = new VertexGap(start)
    this.end = new VertexGap(end)
    this.data = ""
    this.drawn = null
    this._type = "Edge"
  }
}

export class VertexGap extends TypedId {
  vertex: Vertex | null
  pos: IDiagramPosition
  constructor(pos: IDiagramPosition) {
    super()
    this.pos = pos
    this._type = "VertexGap"
    this.vertex = null
  }
}

export interface IDiagramInput {
  importEdge: (edge: Edge) => void
  importVertex: (vertex: Vertex) => void
  importRewriteDiagram: (diagram: Diagram) => void
}
export interface IUpstreamListener {
  upstreamChange: () => void
}

export class Diagram extends TypedId implements IDiagramInput {
  private listeners: (IUpstreamListener)[] = []
  subscribe: (handler: IUpstreamListener) => void = (handler) => {
    this.listeners.push(handler)
  }
  private fireChange: () => void = () => {
    for (var l of this.listeners) {
      l.upstreamChange()
    }
  }
  importEdge: (edge: Edge) => void = (edge: Edge) => {
    this.edges.push(edge)
    this.fillVertexGaps()
    this.fireChange()
  }
  importVertex: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.vertices.push(vertex)
    this.fillVertexGaps()
    this.fireChange()
  }
  importRewriteDiagram: (diagram: Diagram) => void = (diagram: Diagram) => {
    this.edges = []
    this.vertices = []
    this.inferredVertices = []
    this.refreshGapList()
    for (var edge of diagram.edges) {
      this.edges.push(edge)
    }
    for (var vertex of diagram.vertices) {
      this.vertices.push(vertex)
    }
    this.fillVertexGaps()
    this.fireChange()
  }
  edges: Edge[]
  vertices: Vertex[]
  inferredVertices: Vertex[]
  private unpluggedVertexGaps: VertexGap[]
  constructor() {
    super()
    this._type = "Diagram"
    this.edges = []
    this.vertices = []
    this.inferredVertices = []
    this.unpluggedVertexGaps = []
  }
  private refreshGapList() {
    this.unpluggedVertexGaps = []
    for (var edge of this.edges) {
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
      var closestDist = Math.pow(_diagramOptions.closingEdgeVertexDistance, 2) + 1
      var dist = 0
      for (var vx of this.vertices) {
        dist = posnDistanceSquared(gap.pos, vx.pos)
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
      var closestDist = Math.pow(_diagramOptions.closingEdgeEdgeDistance, 2) + 1
      var gap1 = this.unpluggedVertexGaps[i]
      for (var j = i + 1; j < this.unpluggedVertexGaps.length; j++) {
        var gap2 = this.unpluggedVertexGaps[j]
        // Check they are not already filled
        if (gap1.vertex === null && gap2.vertex === null) {
          dist = posnDistanceSquared(gap1.pos, gap2.pos)
          if (dist < closestDist) {
            closestDist = dist
            // Claim closest valid vertex
            var midpoint = [interpolate(0.5, gap1.pos.x, gap2.pos.x), interpolate(0.5, gap1.pos.y, gap2.pos.y)]
            var vx = new Vertex({ x: midpoint[0], y: midpoint[1] })
            this.inferredVertices.push(vx)
            gap1.vertex = vx
            gap2.vertex = vx
          }
        }
      }
      // If, at the end, no other vertexGaps were close, then create a new vertex.
      if (gap1.vertex === null) {
        var vx = new Vertex(gap1.pos)
        gap1.vertex = vx
        this.inferredVertices.push(vx)
      }
    }
  }
  toSVGDrawing(svgIdentifier: string) {
    var svg_holder = SVG(svgIdentifier)
    var edge_group = svg_holder.group()
    for (var edge of this.edges) {
      edge_group.path(edge.drawn.waypoints.join(" "))
    }
  }

}
