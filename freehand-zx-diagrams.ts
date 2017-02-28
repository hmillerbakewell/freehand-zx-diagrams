import pathInterpolate = require("path-interpolate")
import shortid = require("shortid")


shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£')
export class uID {
  constructor() {
    this.id = shortid.generate()
    //idLookup[this.id] = this
  }
  id: string
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
_diagramOptions.closingEdgeVertexDistance = 30
_diagramOptions.closingEdgeEdgeDistance = 20

export class TypedId extends uID {
  type: string
  constructor() {
    super()
    // If you see this, then you didn't set a new type in the constructor
    this.type = "TypedId"
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
    this.type = "DrawnObject"
  }
}

export class DiagramPosition {
  x = 0
  y = 0
  constructor(xyArray: { [id: number]: number }) {
    this.x = xyArray[0]
    this.y = xyArray[1]
  }
}

function posnDistanceSquared(a: DiagramPosition, b: DiagramPosition) {
  var dx = a.x - b.x
  var dy = a.y - b.y
  return dx * dx + dy * dy
}

export class Vertex extends TypedId {
  pos: DiagramPosition
  data: string
  drawn: DrawnObject | null
  constructor(pos: DiagramPosition) {
    super()
    this.pos = pos
    this.data = ""
    this.drawn = null
    this.type = "Vertex"
  }
}

export class Edge extends TypedId {
  start: VertexGap
  end: VertexGap
  data: string
  drawn: DrawnObject | null
  constructor(start: DiagramPosition, end: DiagramPosition) {
    super()
    this.start = new VertexGap(start)
    this.end = new VertexGap(end)
    this.data = ""
    this.drawn = null
    this.type = "Edge"
  }
}

export class VertexGap extends TypedId {
  vertex: Vertex | null
  pos: DiagramPosition
  constructor(pos: DiagramPosition) {
    super()
    this.pos = pos
    this.type = "VertexGap"
    this.vertex = null
  }
}


export class Diagram extends TypedId {
  edges: Edge[]
  vertices: Vertex[]
  inferredVertices: Vertex[]
  unpluggedVertexGaps: VertexGap[]
  paths: DrawnObject[]
  pathDictionary: { [path: string]: (Edge | Vertex) }
  constructor() {
    super()
    this.type = "Diagram"
    this.edges = []
    this.vertices = []
    this.inferredVertices = []
    this.unpluggedVertexGaps = []
    this.paths = []
    this.pathDictionary = {}
  }
  addPath(path: string) {
    let obj = pathToObject(path)
    this.pathDictionary[path] = obj
    if (obj.type === "Edge") {
      this.edges.push(<Edge>obj)
    } else {
      this.vertices.push(<Vertex>obj)
    }
    return obj
  }
  refreshGapList() {
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
  emptyVertexGaps() {
    for (var gap of this.unpluggedVertexGaps) {
      gap.vertex = null
    }
    this.inferredVertices = []
  }
  fillVertexGaps() {
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
    var closestDist = Math.pow(_diagramOptions.closingEdgeEdgeDistance, 2) + 1
    dist = 0
    // For each remaining vertexGap, compare to other vertexGaps
    for (var i = 0; i < this.unpluggedVertexGaps.length; i++) {
      var gap1 = this.unpluggedVertexGaps[i]
      for (var j = i + 1; j < this.unpluggedVertexGaps.length; j++) {
        var gap2 = this.unpluggedVertexGaps[j]
        // Check they are not already filled
        if (gap1.vertex !== null && gap2.vertex !== null) {
          dist = posnDistanceSquared(gap1.pos, gap2.pos)
          if (dist < closestDist) {
            closestDist = dist
            // Claim closest valid vertex
            var midpoint = [pathInterpolate.interpolate(0.5, gap1.pos.x, gap2.pos.x), pathInterpolate.interpolate(0.5, gap1.pos.y, gap2.pos.y)]
            var vx = new Vertex(new DiagramPosition(midpoint))
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
  toSimpleGraph() {
    this.fillVertexGaps()
    var output = {
      node_vertices: {},
      undir_edges: {},
      wire_vertices: {}
    }
    //First user-created vertices
    for (var vertex of this.vertices) {
      output.node_vertices[vertex.id] = {
        "data": {
          "type": "X",
          "value": ""
        },
        "annotation": {
          "coord": [vertex.pos.x, vertex.pos.y]
        }
      }
    }

    //Now count the degree of each inferred vertex
    var degreeById: { [id: string]: number } = {}
    let inc = id => (degreeById[id] = degreeById[id] ? degreeById[id] + 1 : 1)
    for (edge of this.edges) {
      inc(edge.start.vertex.id)
      inc(edge.end.vertex.id)
    }
    //Then inferred vertices
    for (var vertex of this.inferredVertices) {
      var vertexType = ""
      var degree = (degreeById[vertex.id] || 0)
      switch (degree) {
        case 0:
          vertexType = "orphan"
          break;
        case 1:
          vertexType = "input"
          break;
        case 2:
          vertexType = "wire"
          break;
        default:
          vertexType = "error"
          break;
      }

      output.wire_vertices[vertex.id] = {
        "annotation": {
          "boundary": (degree === 1),
          "coord": [vertex.pos.x, vertex.pos.y]
        }
      }
    }
    //Then edges
    for (var edge of this.edges) {
      output.undir_edges[edge.id] = {
        src: edge.start.vertex.id,
        tgt: edge.end.vertex.id
      }
    }
    return JSON.stringify(output)
  }
}

function pathToPosnList(path: number[][]) {
  var posnList = []
  for (var i = 0; i < path.length; i++) {
    posnList.push(new DiagramPosition(path[i]))
  }
  return posnList
}

function pathToObject(pathAsString: string) {
  var interpolatedPath = pathInterpolate(pathAsString, _diagramOptions.interpolationDistance)
  var dO = new DrawnObject()
  dO.start = interpolatedPath.start
  dO.end = interpolatedPath.end
  dO.length = interpolatedPath.length
  dO.bbox = interpolatedPath.bbox
  dO.waypoints = interpolatedPath.waypoints

  var pathAsPositions = pathToPosnList(interpolatedPath.waypoints)
  var itIsAnEdge = true
  // Is it closed?
  var start = new DiagramPosition(interpolatedPath.start)
  var end = new DiagramPosition(interpolatedPath.end)
  if (posnDistanceSquared(start, end) < Math.pow(_diagramOptions.closingEdgeLoopDistance, 2)) {
    itIsAnEdge = false
  }
  var r // result
  if (itIsAnEdge) {
    r = new Edge(start, end)
  } else {
    var midpointX = interpolatedPath.bbox[0] + (interpolatedPath.bbox[2] / 2)
    var midpointY = interpolatedPath.bbox[1] + (interpolatedPath.bbox[3] / 2)
    r = new Vertex(new DiagramPosition([midpointX, midpointY]))
  }
  r.drawn = dO
  return r
}
