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
  start: string
  end: string
  data: any
  constructor(start: Vertex, end: Vertex) {
    super()
    this.start = start.id
    this.end = end.id
    this.data = {}
    this._type = "Edge"
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

  vertexByID: { [id: string]: Vertex } = {}
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
    this.importEdgeDontFire(edge)
    this.fireChange()
  }
  private importEdgeDontFire: (edge: Edge) => void = (edge: Edge) => {
    this.edges.push(edge)
  }
  importVertex: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.importVertexDontFire(vertex)
    this.fireChange()
  }
  private importVertexDontFire: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.vertices.push(vertex)
    this.vertexByID[vertex.id] = vertex
  }
  importRewriteDiagram: (diagram: Diagram) => void = (diagram: Diagram) => {
    this.edges = []
    this.vertices = []
    this.vertexByID = {}
    for (var edge of diagram.edges) {
      this.importEdgeDontFire(edge)
    }
    for (var vertex of diagram.vertices) {
      this.importVertexDontFire(vertex)
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
