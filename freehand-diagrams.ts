import shortid = require("shortid")


shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£')
export abstract class uID {
  id: string
  constructor() {
    this.id = shortid.generate()
    //idLookup[this.id] = this
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

export interface IDiagramPosition {
  x: number
  y: number
}

export function posnDistanceSquared(a: IDiagramPosition, b: IDiagramPosition) {
  var dx = a.x - b.x
  var dy = a.y - b.y
  return dx * dx + dy * dy
}

export class Vertex extends TypedId {
  pos: IDiagramPosition
  data: any
  constructor(pos: IDiagramPosition) {
    super()
    this.pos = pos
    this.data = {}
    this._type = "Vertex"
  }
}

export class Edge extends TypedId {
  start: VertexGap
  end: VertexGap
  data: any
  constructor(start: IDiagramPosition, end: IDiagramPosition) {
    super()
    this.start = new VertexGap(start)
    this.end = new VertexGap(end)
    this.data = {}
    this._type = "Edge"
  }
}

export class VertexGap extends TypedId {
  vertex: Vertex | null
  _pos: IDiagramPosition
  constructor(pos: IDiagramPosition) {
    super()
    this._pos = pos
    this._type = "VertexGap"
    this.vertex = null
  }
  get pos() {
    if (this.vertex) {
      return this.vertex.pos
    } else {
      return this._pos
    }
  }
}

export interface IDiagramInput {
  importEdge: (edge: Edge) => void
  importVertex: (vertex: Vertex) => void
  importRewriteDiagram: (diagram: Diagram) => void
  fireChange: () => void
}
export interface IUpstreamListener {
  upstreamChange: () => void
}

/**
 * Innermost Diagram object
 * Has edges, vertices, ways to import them and events
 */
export class Diagram extends TypedId implements IDiagramInput {

  // Event handling

  private listeners: (IUpstreamListener)[] = []
  subscribe: (handler: IUpstreamListener) => void = (handler) => {
    this.listeners.push(handler)
  }
  fireChange: () => void = () => {
    for (var l of this.listeners) {
      l.upstreamChange()
    }
  }

  // Importing
  importEdge: (edge: Edge) => void = (edge: Edge) => {
    this.edges.push(edge)
    this.fireChange()
  }
  importVertex: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.vertices.push(vertex)
    this.fireChange()
  }
  importRewriteDiagram: (diagram: Diagram) => void = (diagram: Diagram) => {
    this.edges = []
    this.vertices = []
    for (var edge of diagram.edges) {
      this.importEdge(edge)
    }
    for (var vertex of diagram.vertices) {
      this.importVertex(vertex)
    }
    this.fireChange()
  }
  edges: Edge[] = []
  vertices: Vertex[] = []

  toString: () => string = () => {
    var dummyDiagram = {
      edges: this.edges,
      vertices: this.vertices
    }
    return JSON.stringify(dummyDiagram, undefined, 2)
  }
}
