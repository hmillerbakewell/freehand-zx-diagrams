import Diagrams = require("./diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("./path-interpolate")
import waypointsToSmoothPath = require("./waypoints-to-smooth-path.js")
import RDP = require("./RamerDouglasPeucker.js")
import ZX = require("./zx-theory.js")
import ZXIO = require("./zx-io.js")
import recognise = require("./zx-freehand-node.js")

/** Types of object expected to be drawn. */
enum ENUMSVGDrawingType { PATH, CIRCLE, RECT }

/** Data needed for colouring an object. */
interface ISVGColoured {
  strokeData?: SVG.StrokeData
  fillColor?: string
}

/** Vertex data that may have been inferred rather than explicitly given. */
type IInferreableVertexData = ZXIO.IVertexData & ZXIO.IInferrable

/** All of the allowed SVG data interfaces. */
type ISVGAllowed =
  (ZXIO.ISVGCircle | ZXIO.ISVGPath | ZXIO.ISVGRect) & ISVGColoured

/** An object ready to be drawn in SVG. */
class SVGDrawableElement {
  type: ENUMSVGDrawingType
  dataRect?: ZXIO.IVertexData & ZXIO.ISVGRect
  dataPath?: ZXIO.IEdgeData & ZXIO.ISVGPath
  dataCircle?: ZXIO.IVertexData & ZXIO.ISVGCircle
  color: ISVGColoured
}

/** IO module for freehand drawing ZX diagrams on an SVG element. */
export class FreehandOnSVGIOModule extends ZXIO.HTMLModule {
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
  closingEdgeEdgeDistance: number = 20
  closingEdgeVertexDistance: number = 20

  private diagUserDrawingOnly: Diagrams.Diagram
  private diagMergedVertices: Diagrams.Diagram

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

  /** Create the SVG object in the given jquery place */
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
    this.diagUserDrawingOnly = new Diagrams.Diagram()
    this.diagMergedVertices = new Diagrams.Diagram()
    this.outputDiagram = new Diagrams.Diagram()
  }
  outputDiagram: Diagrams.Diagram
  /** Add a point to the currently drawing path. */
  addPoint: (x: number, y: number) => void = (x: number, y: number) => {
    this.lastTimeTriggered = (new Date()).getMilliseconds()
    if (this.takeInput) {
      var round = function (x: number, accuracy: number) {
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
  /** Begin the drawing of a path. */
  startPath: () => void = () => {
    this.currentPath = "";
  }
  /** Complete the drawing of a path and attempt to process it. */
  endPath: () => void = () => {
    var s = this.currentPath;
    var svgPathWithData = <SVGDrawableElement>{
      type: ENUMSVGDrawingType.PATH,
      dataPath: {
        type: ZX.EDGETYPES.PLAIN,
        path: s,
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
    if (this.diagUserDrawingOnly) {
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
    for (let vertex of this.diagMergedVertices.vertices) {
      if (!(<IInferreableVertexData>vertex.data).inferred) {
        packetDiagram.importVertex(vertex)
        verticesAddedToPacket[vertex.id] = true
      }
      vertexByID[vertex.id] = vertex
    }
    for (let edge of this.diagMergedVertices.edges) {
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
  /**
   * Interpret the given path as an object and add it to the diagram.
   * @param {string} pathAsString the path in SVGPath or similar format
   */
  importPathAsObject:
  (pathAsString: string) => (Diagrams.Edge | Diagrams.Vertex | null)
  = (pathAsString: string) => {

    var originalPath = pathAsString
    pathAsString = pathAsString
      .replace(/[a-zA-Z]/g, '')
      .replace(/[\s,]+/g, ' ')
      .trim()
    var interpolatedPath =
      pathInterpolate(pathAsString, ZXIO.defaultRadius / 10)
    var RDPWaypoints = RDP
      .RamerDouglasPeucker(interpolatedPath.waypoints, ZXIO.defaultRadius / 10)
      .concat([interpolatedPath.end])

    var smootherRDP = RDP
      .RamerDouglasPeucker(interpolatedPath.waypoints, ZXIO.defaultRadius)
      .concat([interpolatedPath.end])


    var nodeData = recognise.recogniseNodeDataSimple(
      [pathToPosnList(RDPWaypoints)]
    )

    var r: (Diagrams.Vertex | Diagrams.Edge)

    var tempVertexData: IInferreableVertexData = {
      inferred: true,
      label: "",
      radius: ZXIO.defaultRadius,
      type: ZX.VERTEXTYPES.WIRE
    }

    if (nodeData.type === ZX.VERTEXTYPES.WIRE ||
      nodeData.radius > 50) {
      // Either it is small and looks like a wire, or it is huge:
      var start = { x: interpolatedPath.start[0], y: interpolatedPath.start[1] }
      var end = { x: interpolatedPath.end[0], y: interpolatedPath.end[1] }

      var vStart = new Diagrams.Vertex(start)
      vStart.data = tempVertexData
      this.diagUserDrawingOnly.importVertex(vStart)
      var vEnd = new Diagrams.Vertex(end)
      vEnd.data = tempVertexData
      this.diagUserDrawingOnly.importVertex(vEnd)

      r = new Diagrams.Edge(vStart, vEnd)
      var edgeData: ZXIO.IEdgeData = {
        type: ZX.EDGETYPES.PLAIN,
        RDPWaypoints: pathToPosnList(smootherRDP),
        path: originalPath
      }
      r.data = edgeData
      this.diagUserDrawingOnly.importEdge(r)
    } else {
      // It is therefore small, and not a wire
      var midpointX = interpolatedPath.bbox[0]
        + (interpolatedPath.bbox[2] / 2)
      var midpointY = interpolatedPath.bbox[1]
        + (interpolatedPath.bbox[3] / 2)
      r = new Diagrams.Vertex({ x: midpointX, y: midpointY })
      r.data = nodeData
      this.diagUserDrawingOnly.importVertex(r)
    }
    return r
  }

  /** Overwrite the internal diagram with new data. */
  importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
  = (diagram) => {
    if (diagram.toJSON() !== this.outputDiagram.toJSON()) {
      this.paths = []
      for (let edge of diagram.edges) {
        var data = <ZX.IEdgeData & ZXIO.IEdgeData>edge.data
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

      for (let vertex of diagram.vertices) {
        let data = <ZXIO.IVertexData>vertex.data
        let pos = <Diagrams.IDiagramPosition>vertex.pos
        let radius = (data.radius) || ZXIO.defaultRadius
        switch (data.type) {
          case ZX.VERTEXTYPES.INPUT:
          case ZX.VERTEXTYPES.OUTPUT:
          case ZX.VERTEXTYPES.WIRE:
            var smallBox: SVGDrawableElement = {
              type: ENUMSVGDrawingType.RECT,
              dataRect: {
                width: 1,
                height: 1,
                x: pos.x,
                y: pos.y,
                type: data.type,
                label: "",
                radius: radius
              },
              color: {
                strokeData: {color: "black"},
                fillColor: "black"
              }

            }
            this.paths.push(smallBox)
            break;
          case ZX.VERTEXTYPES.HADAMARD:
            var hadamardBox: SVGDrawableElement = {
              type: ENUMSVGDrawingType.RECT,
              dataRect: {
                width: 2 * radius,
                height: 2 * radius,
                x: vertex.pos.x - radius,
                y: vertex.pos.y - radius,
                radius: radius,
                type: ZX.VERTEXTYPES.HADAMARD,
                label: ""
              },
              color: {
                strokeData: {color: "black"},
                fillColor: "white"
              }
            }
            this.paths.push(hadamardBox)
            break;
          case ZX.VERTEXTYPES.Z:
            var zNode: SVGDrawableElement = {
              type: ENUMSVGDrawingType.CIRCLE,
              dataCircle: {
                type: data.type,
                label: data.label,
                radius: radius,
                cx: pos.x,
                cy: pos.y
              },
              color: {
                strokeData: {color: "black"},
                fillColor: "white"
              }
            }
            this.paths.push(zNode)
            break;
          case ZX.VERTEXTYPES.X:
            var xNode: SVGDrawableElement = {
              type: ENUMSVGDrawingType.CIRCLE,
              dataCircle: {
                label: data.label,
                type: data.type,
                radius: radius,
                cx: pos.x,
                cy: pos.y
              },
              color: {
                strokeData: {color: "black"},
                fillColor: "black"
              }
            }
            this.paths.push(xNode)
            break;
        }
      }
      this.drawAllShapes()
      this.diagUserDrawingOnly.importRewriteDiagram(diagram)
      this.diagMergedVertices.importRewriteDiagram(diagram)
      this.outputDiagram.importRewriteDiagram(diagram)
    }
  }

  /**
   * Takes every shape in this.paths[] and renders it as best it can.
   */
  drawAllShapes = () => {
    var svg = this.svgElement;
    svg.clear();
    var svgElementCreated: SVG.Element
    for (var shape of this.paths) {
      switch (shape.type) {
        case ENUMSVGDrawingType.PATH:
          if (shape.dataPath.path && shape.dataPath.path.length > 0) {
            svgElementCreated = svg.path(shape.dataPath.path)
          }
          else if (shape.dataPath.RDPWaypoints) {
            svgElementCreated = svg.path(
              waypointsToSmoothPath.smooth(shape.dataPath.RDPWaypoints)
            )
          } else {
          }
          break;
        case ENUMSVGDrawingType.CIRCLE:
          var dataCirc = (shape.dataCircle)
          svgElementCreated = svg.circle(dataCirc.radius * 2)
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


    // Throw everything into the diagram used for merging:
    this.diagMergedVertices.importRewriteDiagram(this.diagUserDrawingOnly)

    //First get list of vertexGaps
    // For each vertexGap compare distances to each vertex
    var inferredVertices: Diagrams.Vertex[] = []
    var fixedVertices: Diagrams.Vertex[] = []
    var vertexPositions: { [id: string]: Diagrams.IDiagramPosition } = {}
    for (let vertex of this.diagMergedVertices.vertices) {
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
        swapEdgeVertex(this.diagMergedVertices, infVertex, closestFixedVertex)
      }
    }

    // Try and join any inferred vertex to another inferred vertex
    for (var i = 0; i < inferredVertices.length; i++) {
      let infVertex1 = inferredVertices[i]
      let closestDist = Math.pow(this.closingEdgeEdgeDistance, 2)
      let dist = 0
      let closestInfVertex: (Diagrams.Vertex | null) = null
      for (var j = i + 1; j < inferredVertices.length; j++) {
        let infVertex2 = inferredVertices[j]
        dist = Diagrams.posnDistanceSquared(infVertex1.pos, infVertex2.pos)
        if (dist <= closestDist) {
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
        this.diagMergedVertices.importVertex(vx)
        swapEdgeVertex(this.diagMergedVertices, closestInfVertex, vx)
        swapEdgeVertex(this.diagMergedVertices, infVertex1, vx)
      } else {
        // create an input vertex to join to
        let vx = new Diagrams.Vertex(infVertex1.pos)
        vx.data = <ZX.IVertexData>{
          type: ZX.VERTEXTYPES.INPUT,
          label: "",
          inferred: true
        }
        this.diagMergedVertices.importVertex(vx)
        swapEdgeVertex(this.diagMergedVertices, infVertex1, vx)
      }
    }
  }
}

/** Given positions as number[][] return {x,y}[] */
function pathToPosnList(path: number[][]) {
  var posnList = []
  for (var i = 0; i < path.length; i++) {
    posnList.push({ x: path[i][0], y: path[i][1] })
  }
  return posnList
}

/**
 * Interpolate lambda of the way between a and b.
 */
function interpolate(lambda: number, a: number, b: number) {
  return ((1 - lambda) * a + lambda * b)
}


