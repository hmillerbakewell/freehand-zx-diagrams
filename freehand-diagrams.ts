import shortid = require("shortid")


shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£'
)
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
  importRewriteDiagram: (diagram: IDiagramOutput) => void
}
export interface IDiagramOutput {
  edges: Edge[]
  edgeById: { [index: string]: Edge }
  vertices: Vertex[]
  vertexById: { [index: string]: Vertex }
  toJSON: () => string
}
export interface IStreamCaller {
  subscribe: (handler: IStreamListener) => void
}
export interface IStreamListener {
  upstreamChange: (diagram: IDiagramOutput) => void
}

/**
 * Diagram object
 * Has edges, vertices, ways to input, output and events
 */
export class Diagram
  extends TypedId
  implements IDiagramInput, IDiagramOutput, IStreamCaller {
  // Event handling

  private listeners: (IStreamListener)[] = []
  subscribe: (handler: IStreamListener) => void = (handler) => {
    this.listeners.push(handler)
  }
  fireChange: () => void = () => {
    this.redoJSON()
    for (var l of this.listeners) {
      l.upstreamChange(this)
    }
  }

  // Importing
  importEdge: (edge: Edge) => void = (edge: Edge) => {
    this.importEdgeDontFire(edge)
    this.fireChange()
  }
  private importEdgeDontFire: (edge: Edge) => void = (edge: Edge) => {
    this.edges.push(edge)
    this.edgeById[edge.id] = edge
  }
  importVertex: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.importVertexDontFire(vertex)
    this.fireChange()
  }
  private importVertexDontFire: (vertex: Vertex) => void
  = (vertex: Vertex) => {
    this.vertices.push(vertex)
    this.vertexById[vertex.id] = vertex
  }
  importRewriteDiagram: (diagram: IDiagramOutput) => void
  = (diagram: IDiagramOutput) => {
    var previousToJSON = this.toJSON()
    var newJSONparse = <IDiagramOutput>JSON.parse(diagram.toJSON())
    this.edges = []
    this.vertices = []
    this.vertexById = {}
    for (var vertex of newJSONparse.vertices) {
      var v = new Vertex(vertex.pos)
      v.id = vertex.id
      v.data = vertex.data
      this.importVertexDontFire(v)
    }
    for (var edge of newJSONparse.edges) {
      var e = new Edge(
        diagram.vertexById[edge.start],
        diagram.vertexById[edge.end])
      e.id = edge.id
      e.data = edge.data
      this.importEdgeDontFire(e)
    }
    this.redoJSON()
    if (this.toJSON() !== previousToJSON) {
      this.fireChange()
    }
  }
  edges: Edge[] = []
  vertices: Vertex[] = []
  edgeById: { [index: string]: Edge } = {}
  vertexById: { [index: string]: Vertex } = {}

  private _toJSON: string; // Caching no longer used
  private redoJSON: () => string = () => {

    var dummyDiagram = {
      edges: this.edges,
      vertices: this.vertices
    }
    var newJSON = JSON.stringify(dummyDiagram, undefined, 2)
    this._toJSON = newJSON
    return this._toJSON
  }
  toJSON: () => string = () => {
    return this.redoJSON()
  }
}
