import shortid = require("shortid")


shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£'
)

/**
 * Class that contains an unique ID.
 */
export abstract class uID {
  id: string
  constructor() {
    this.id = shortid.generate()
    //idLookup[this.id] = this
  }
}

/**
 * Class that has a .type and a unique ID.
 */
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

/**
 * Coordinates that every diagram element uses.
 */
export interface IDiagramPosition {
  x: number
  y: number
}

/**
 * Euclidean distance squared.
 * @param a 
 * @param b 
 */
export function posnDistanceSquared(a: IDiagramPosition, b: IDiagramPosition) {
  var dx = a.x - b.x
  var dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * A vertex in a diagram.
 * Created using a position.
 * All data is accessible.
 */
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

/**
 * An edge in a diagram.
 * Specified using start and end vertices.
 * This is to ensure these vertices exist.
 */
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

/**
 * Anything that accepts diagram data.
 */
export interface IDiagramInput {
  importRewriteDiagram: (diagram: IDiagramOutput) => void
}
/**
 * Anything that presents diagram data.
 */
export interface IDiagramOutput {
  edges: Edge[]
  edgeById: { [index: string]: Edge }
  vertices: Vertex[]
  vertexById: { [index: string]: Vertex }
  toJSON: () => string
}
/**
 * Something that can push diagram changes downstream.
 */
export interface IStreamCaller {
  subscribe: (handler: IStreamListener) => void
}
/**
 * Something that listens for upstream diagram changes.
 */
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
  /** Add a listener to this object's changes. */
  subscribe: (handler: IStreamListener) => void = (handler) => {
    this.listeners.push(handler)
  }
  /** Notify all downstream listeners. */
  fireChange: () => void = () => {
    for (var l of this.listeners) {
      l.upstreamChange(this)
    }
  }

  // Importing
  /** Add a single edge */
  importEdge: (edge: Edge) => void = (edge: Edge) => {
    this.importEdgeDontFire(edge)
    this.fireChange()
  }
  private importEdgeDontFire: (edge: Edge) => void = (edge: Edge) => {
    this.edges.push(edge)
    this.edgeById[edge.id] = edge
  }
  /** Add a single vertex */
  importVertex: (vertex: Vertex) => void = (vertex: Vertex) => {
    this.importVertexDontFire(vertex)
    this.fireChange()
  }
  private importVertexDontFire: (vertex: Vertex) => void
  = (vertex: Vertex) => {
    this.vertices.push(vertex)
    this.vertexById[vertex.id] = vertex
  }
  /** Rewrite the existing diagram data with new data */
  importRewriteDiagram: (diagram: IDiagramOutput) => void
  = (diagram: IDiagramOutput) => {
    var previousToJSON = this.toJSON()
    var newJSONparse
    if (diagram.toJSON) {
      // If the passed object is a fully formed diagram
      // then is has methods attached we can call
      newJSONparse = <IDiagramOutput>JSON.parse(diagram.toJSON())
    } else {
      // otherwise, it is just a bundle of edges and vertices
      newJSONparse = diagram
    }
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
        this.vertexById[edge.start],
        this.vertexById[edge.end])
      e.id = edge.id
      e.data = edge.data
      this.importEdgeDontFire(e)
    }
    if (this.toJSON() !== previousToJSON) {
      this.fireChange()
    }
  }
  edges: Edge[] = []
  vertices: Vertex[] = []
  edgeById: { [index: string]: Edge } = {}
  vertexById: { [index: string]: Vertex } = {}

  /** Create JSON bare bones data of this diagram*/
  toJSON: () => string = () => {
    var dummyDiagram = {
      edges: this.edges,
      vertices: this.vertices
    }
    var newJSON = JSON.stringify(dummyDiagram, undefined, 2)
    return newJSON
  }
}
