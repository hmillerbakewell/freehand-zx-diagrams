import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import RDP = require("./RamerDouglasPeucker.js")
import ZX = require("./theory-ZX.js")

interface IVertexDataInferred {
  inferred: boolean
}

enum ENUMSVGDrawingType { PATH, CIRCLE, RECT }
interface ISVGColoured {
  strokeData?: SVG.StrokeData
  fillColor?: string
}
interface ISVGPath {
  path: string
}
interface ISVGRect {
  width: number
  height: number
  x: number
  y: number
}
interface ISVGCircle {
  radius: number
  cx: number
  cy: number
}

type ISVGAllowed = (ISVGCircle | ISVGPath | ISVGRect) & ISVGColoured
class SVGDrawableElement {
  type: ENUMSVGDrawingType
  dataRect?: ISVGRect
  dataPath?: DiagramIO.IFreehandOnSVGEdge
  dataCircle?: ISVGCircle
  color: ISVGColoured
}


export class FreehandOnSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
  takeInput: boolean
  private currentPath: string
  private paths: SVGDrawableElement[] = []
  private defaultStrokeData: SVG.StrokeData = {
    color: "black",
    width: 1
  }
  svgElement: SVG.Container
  private lastTimeTriggered: number
  mousePos: SVG.Point
  closingVertexDistance: number = 20
  closingEdgeEdgeDistance: number = 20
  closingEdgeVertexDistance: number = 20

  private virtualDiagram: Diagrams.Diagram

  // Mouse Events

  private mousedown: (e: MouseEvent) => void = (e) => {
    e.preventDefault()
    var cursor = this.cursor(e)
    this.startPath();
    this.takeInput = true;
    this.addPoint(cursor.x, cursor.y);

  }
  private mouseup: (e: MouseEvent) => void = (e) => {
    e.preventDefault()
    var cursor = this.cursor(e)

    this.addPoint(cursor.x, cursor.y);
    this.endPath();
    this.takeInput = false;
  }
  private mousemove: (e: MouseEvent) => void = (e) => {
    e.preventDefault()
    var cursor = this.cursor(e)
    this.addPoint(cursor.x, cursor.y);

  }


  createSVGHolder: (selector: string) => void = (selector: string) => {
    this.svgElement = SVG(selector)
    this.svgElement.viewbox({ x: 0, y: 0, width: 500, height: 500 });

    // Mouse events
    this.svgElement.mousedown(this.mousedown);
    this.svgElement.mouseup(this.mouseup);
    this.svgElement.mousemove(this.mousemove);
  }

  private cursor: (e: MouseEvent) => SVGPoint = (e) => {
    this.mousePos = new SVG.Point(e.clientX, e.clientY)
    if (this.svgElement) {
      let transcribedPoint = this.mousePos.transform(
        this.svgElement.screenCTM().inverse()
      )
      return transcribedPoint.native();
    } else {
      return this.mousePos.native()
    }
  }


  constructor() {
    super()
    //this.upstreamDiagram.subscribe(this)
    this.takeInput = false
    this.currentPath = ""
    this.paths = []
    this.svgElement = null
    this.lastTimeTriggered = (new Date()).getMilliseconds()
    this.mousePos = new SVG.Point(0, 0)
    this.virtualDiagram = new Diagrams.Diagram()
    this.outputDiagram = new Diagrams.Diagram()
  }
  outputDiagram: Diagrams.Diagram
  addPoint: (x: number, y: number) => void = (x: number, y: number) => {
    this.lastTimeTriggered = (new Date()).getMilliseconds()
    if (this.takeInput) {
      var round = function (x : number, accuracy : number) {
        return Math.round(x * accuracy) / accuracy;
      }
      var s = this.currentPath.length === 0 ? "M" : "L";
      s += x
      s += ", ";
      s += y
      s += " ";
      this.currentPath += s;
      this.svgElement.path(this.currentPath).stroke("black").fill("transparent")
    }
  }
  startPath: () => void = () => {
    this.currentPath = "";
  }
  endPath: () => void = () => {
    var s = this.currentPath;
    var svgPathWithData = <SVGDrawableElement>{
      type: ENUMSVGDrawingType.PATH,
      dataPath: {
        originalPath: s,
        RDPWaypoints: null
      },
      color: {
        strokeData: "black",
        fillColor: "transparent"
      }
    }
    this.paths.push(svgPathWithData)
    this.currentPath = "";
    this.takeInput = false
    // Update the private virtual diagram
    if (this.virtualDiagram) {
      this.importPathAsObject(s)
    }
    // Try and tie up loose edges, etc. in the virtual diagram
    this.mergeNearbyVertices()
    this.pushChangesDownstream()
    this.drawAllShapes()
  }
  private pushChangesDownstream: () => void = () => {

    // Create another dummy diagram
    // This is the one we will send off
    var packetDiagram = new Diagrams.Diagram()
    // Add all the uninferred vertices
    var vertexByID: { [index: string]: Diagrams.Vertex } = {}
    var verticesAddedToPacket: { [index: string]: boolean } = {}
    for (let vertex of this.virtualDiagram.vertices) {
      if (!(<IVertexDataInferred>vertex.data).inferred) {
        packetDiagram.importVertex(vertex)
        verticesAddedToPacket[vertex.id] = true
      }
      vertexByID[vertex.id] = vertex
    }
    for (let edge of this.virtualDiagram.edges) {
      packetDiagram.importEdge(edge)
      // Add any vertices the edge is joined to
      if (!verticesAddedToPacket[edge.start]) {
        packetDiagram.importVertex(vertexByID[edge.start])
        verticesAddedToPacket[edge.start] = true
      }
      if (!verticesAddedToPacket[edge.end]) {
        packetDiagram.importVertex(vertexByID[edge.end])
        verticesAddedToPacket[edge.end] = true
      }
    }
    this.outputDiagram.importRewriteDiagram(packetDiagram)
  }
  importPathAsObject:
  (pathAsString: string) => (Diagrams.Edge | Diagrams.Vertex | null)
  = (pathAsString: string) => {
    var originalPath = pathAsString
    pathAsString = pathAsString
      .replace(/[a-zA-Z]/g, '')
      .replace(/[\s,]+/g, ' ')
      .trim()
    var interpolatedPath = pathInterpolate(pathAsString, 10)
    var RDPWaypoints = RDP
      .RamerDouglasPeucker(interpolatedPath.waypoints, 10)
      .concat([interpolatedPath.end])
    if (interpolatedPath.length > 10) {

      var pathAsPositions = pathToPosnList(RDPWaypoints)
      var itIsAnEdge = true
      // Is it closed?
      var start = { x: interpolatedPath.start[0], y: interpolatedPath.start[1] }
      var end = { x: interpolatedPath.end[0], y: interpolatedPath.end[1] }
      if (
        Diagrams.posnDistanceSquared(start, end)
        <
        Math.pow(this.closingVertexDistance, 2)) {
        itIsAnEdge = false
      }
      var r: (Diagrams.Edge | Diagrams.Vertex) // result
      if (itIsAnEdge) {
        var vStart = new Diagrams.Vertex(start)
        vStart.data = <IVertexDataInferred>{ inferred: true }
        this.virtualDiagram.importVertex(vStart)
        var vEnd = new Diagrams.Vertex(end)
        vEnd.data = <IVertexDataInferred>{ inferred: true }
        this.virtualDiagram.importVertex(vEnd)

        r = new Diagrams.Edge(vStart, vEnd)
        r.data = <DiagramIO.IFreehandOnSVGEdge & ZX.IEdgeData>{
          type: ZX.EDGETYPES.PLAIN,
          RDPWaypoints: pathToPosnList(RDPWaypoints),
          originalPath: originalPath
        }
        this.virtualDiagram.importEdge(r)
      } else {
        var midpointX = interpolatedPath.bbox[0]
          + (interpolatedPath.bbox[2] / 2)
        var midpointY = interpolatedPath.bbox[1]
          + (interpolatedPath.bbox[3] / 2)
        r = new Diagrams.Vertex({ x: midpointX, y: midpointY })
        r.data = <ZX.IVertexData>{
          type: ZX.VERTEXTYPES.Z,
          label: ""
        }
        this.virtualDiagram.importVertex(r)
      }
      return r
    } else {
      return null
    }
  }
  importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
  = (diagram) => {
    if (diagram.toJSON() !== this.outputDiagram.toJSON()) {
      this.paths = []
      for (let vertex of diagram.vertices) {
        switch ((<ZX.IVertexData>vertex.data).type) {
          case ZX.VERTEXTYPES.INPUT:
          case ZX.VERTEXTYPES.OUTPUT:
          case ZX.VERTEXTYPES.WIRE:
            var smallBox: SVGDrawableElement = {
              type: ENUMSVGDrawingType.RECT,
              dataRect: {
                width: 1,
                height: 1,
                x: vertex.pos.x,
                y: vertex.pos.y
              },
              color: {
                strokeData: "black",
                fillColor: "black"
              }

            }
            this.paths.push(smallBox)
            break;
          case ZX.VERTEXTYPES.HADAMARD:
            var hadamardBox: SVGDrawableElement = {
              type: ENUMSVGDrawingType.RECT,
              dataRect: {
                width: 10,
                height: 10,
                x: vertex.pos.x-5,
                y: vertex.pos.y-5
              },
              color: {
                strokeData: "black",
                fillColor: "transparent"
              }
            }
            this.paths.push(hadamardBox)
            break;
          case ZX.VERTEXTYPES.Z:
            var zNode: SVGDrawableElement = {
              type: ENUMSVGDrawingType.CIRCLE,
              dataCircle: {
                radius: 10,
                cx: vertex.pos.x,
                cy: vertex.pos.y
              },
              color: {
                strokeData: "black",
                fillColor: "transparent"
              }
            }
            this.paths.push(zNode)
            break;
          case ZX.VERTEXTYPES.X:
            var xNode: SVGDrawableElement = {
              type: ENUMSVGDrawingType.CIRCLE,
              dataCircle: {
                radius: 10,
                cx: vertex.pos.x,
                cy: vertex.pos.y
              },
              color: {
                strokeData: "black",
                fillColor: "black"
              }
            }
            this.paths.push(xNode)
            break;
        }
      }
      for (let edge of diagram.edges) {
        var data = <ZX.IEdgeData & DiagramIO.IFreehandOnSVGEdge>edge.data
        switch (data.type) {
          case ZX.EDGETYPES.PLAIN:
            var edgePath: SVGDrawableElement = {
              type: ENUMSVGDrawingType.PATH,
              dataPath: data,
              color: {
                fillColor: "transparent"
              }
            }
            this.paths.push(edgePath)
            break;
        }
      }
      this.drawAllShapes()
      this.virtualDiagram.importRewriteDiagram(diagram)
      this.outputDiagram.importRewriteDiagram(diagram)
    }
  }
  drawAllShapes = () => {
    var svg = this.svgElement;
    svg.clear();
    var svgElementCreated: SVG.Element
    for (var shape of this.paths) {
      switch (shape.type) {
        case ENUMSVGDrawingType.PATH:
          if (shape.dataPath.originalPath) {
            svgElementCreated = svg.path(shape.dataPath.originalPath)
          }
          break;
        case ENUMSVGDrawingType.CIRCLE:
          var dataCirc = (shape.dataCircle)
          svgElementCreated = svg.circle(dataCirc.radius)
          svgElementCreated.cx(dataCirc.cx)
          svgElementCreated.cy(dataCirc.cy)
          break;
        case ENUMSVGDrawingType.RECT:
          var dataRect = (shape.dataRect)
          svgElementCreated = svg.rect(dataRect.width, dataRect.height)
          svgElementCreated.x(dataRect.x)
          svgElementCreated.y(dataRect.y)
          break;
      }
      var colorData = <ISVGColoured>shape.color
      svgElementCreated
        .stroke(this.defaultStrokeData)
        .stroke(colorData.strokeData)
        .fill(colorData.fillColor);
    }
  }

  // Joining edges and vertices
  private mergeNearbyVertices: () => void = () => {
    //First get list of vertexGaps
    // For each vertexGap compare distances to each vertex
    var inferredVertices: Diagrams.Vertex[] = []
    var fixedVertices: Diagrams.Vertex[] = []
    var vertexPositions: { [id: string]: Diagrams.IDiagramPosition } = {}
    for (let vertex of this.virtualDiagram.vertices) {
      if (vertex.data.inferred) {
        inferredVertices.push(vertex)
      } else {
        fixedVertices.push(vertex)
      }
      vertexPositions[vertex.id] = vertex.pos
    }

    var swapEdgeVertex = function (
      D: Diagrams.Diagram,
      oldVertex: Diagrams.Vertex,
      newVertex: Diagrams.Vertex) {
      for (let edge of D.edges) {
        if (edge.start === oldVertex.id) {
          edge.start = newVertex.id
        }
        if (edge.end === oldVertex.id) {
          edge.end = newVertex.id
        }
      }
    }
    // Try and join any inferred vertex to a close fixed vertex
    for (let infVertex of inferredVertices) {
      let closestDist = Math.pow(this.closingEdgeVertexDistance, 2) + 1
      let closestFixedVertex: (Diagrams.Vertex | null) = null
      let dist = 0
      for (let fixVertex of fixedVertices) {
        dist = Diagrams.posnDistanceSquared(infVertex.pos, fixVertex.pos)
        if (dist < closestDist) {
          closestDist = dist
          // Claim closest fixed vertex
          closestFixedVertex = fixVertex
        }
      }
      if (closestFixedVertex) {
        swapEdgeVertex(this.virtualDiagram, infVertex, closestFixedVertex)
      }
    }

    // Try and join any inferred vertex to another inferred vertex
    for (var i = 0; i < inferredVertices.length; i++) {
      let infVertex1 = inferredVertices[i]
      let closestDist = Math.pow(this.closingEdgeEdgeDistance, 2) + 1
      let dist = 0
      let closestInfVertex: (Diagrams.Vertex | null) = null
      for (var j = i + 1; j < inferredVertices.length; j++) {
        let infVertex2 = inferredVertices[j]
        dist = Diagrams.posnDistanceSquared(infVertex1.pos, infVertex2.pos)
        if (dist < closestDist) {
          closestDist = dist
          // Claim closest fixed vertex
          closestInfVertex = infVertex2
        }
      }
      if (closestInfVertex) {
        // create a single vertex in the middle

        let midpoint = [
          interpolate(0.5, infVertex1.pos.x, closestInfVertex.pos.x),
          interpolate(0.5, infVertex1.pos.y, closestInfVertex.pos.y)
        ]
        let vx = new Diagrams.Vertex({ x: midpoint[0], y: midpoint[1] })
        vx.data = <ZX.IVertexData>{
          type: ZX.VERTEXTYPES.WIRE,
          label: "",
          inferred: true
        }
        this.virtualDiagram.importVertex(vx)
        swapEdgeVertex(this.virtualDiagram, closestInfVertex, vx)
        swapEdgeVertex(this.virtualDiagram, infVertex1, vx)
      } else {
        // create a wire vertex to join to
        let vx = new Diagrams.Vertex(infVertex1.pos)
        vx.data = <ZX.IVertexData>{
          type: ZX.VERTEXTYPES.INPUT,
          label: "",
          inferred: true
        }
        this.virtualDiagram.importVertex(vx)
        swapEdgeVertex(this.virtualDiagram, infVertex1, vx)
      }
    }

  }


}

function pathToPosnList(path: number[][]) {
  var posnList = []
  for (var i = 0; i < path.length; i++) {
    posnList.push({ x: path[i][0], y: path[i][1] })
  }
  return posnList
}


function interpolate(lambda: number, a: number, b: number) {
  return ((1 - lambda) * a + lambda * b)
}