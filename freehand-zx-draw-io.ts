import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import waypointsToSmoothPath = require("./waypoints-to-smooth-path.js")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import RDP = require("./RamerDouglasPeucker.js")
import ZX = require("./theory-ZX.js")
import convexHull = require("convexhull-js")



interface IDataInferred {
  inferred: boolean
}

type IVertexData = IDataInferred & ZX.IVertexData & DiagramIO.ISVGVertexData
type IEdgeData = ZX.IEdgeData & DiagramIO.ISVGEdgeData

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
  dataPath?: DiagramIO.ISVGEdgeData
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
      if (!(<IDataInferred>vertex.data).inferred) {
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
   * Import Path as Object
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
    var interpolatedPath = pathInterpolate(pathAsString, 1)
    var RDPWaypoints = RDP
      .RamerDouglasPeucker(interpolatedPath.waypoints, 1)
      .concat([interpolatedPath.end])

    var smootherRDP = RDP
      .RamerDouglasPeucker(interpolatedPath.waypoints, 10)
      .concat([interpolatedPath.end])


    var nodeData = recogniseNodeData([pathToPosnList(RDPWaypoints)])

    var r: (Diagrams.Vertex | Diagrams.Edge)

    var tempVertexData: IVertexData = {
      inferred: true,
      label: "",
      radius: 5,
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
      var edgeData: IEdgeData = {
        type: ZX.EDGETYPES.PLAIN,
        RDPWaypoints: pathToPosnList(smootherRDP),
        originalPath: originalPath
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
  importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
  = (diagram) => {
    if (diagram.toJSON() !== this.outputDiagram.toJSON()) {
      this.paths = []
      for (let edge of diagram.edges) {
        var data = <ZX.IEdgeData & DiagramIO.ISVGEdgeData>edge.data
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
                  x: vertex.pos.x - 5,
                  y: vertex.pos.y - 5
                },
                color: {
                  strokeData: "black",
                  fillColor: "white"
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
                  fillColor: "white"
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
      }
      this.drawAllShapes()
      this.diagUserDrawingOnly.importRewriteDiagram(diagram)
      this.diagMergedVertices.importRewriteDiagram(diagram)
      this.outputDiagram.importRewriteDiagram(diagram)
    }
  }

  /**
   * Draw All Shapes
   * Takes every shape in this.paths[] and renders it as best it can
   */
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
          else if (shape.dataPath.RDPWaypoints) {
            svgElementCreated = svg.path(
              waypointsToSmoothPath.smooth(shape.dataPath.RDPWaypoints)
            )
          } else {

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


function recogniseNodeData(waypointLists: Diagrams.IDiagramPosition[][]) {
  type coord = Diagrams.IDiagramPosition
  var allPoints = waypointLists.reduce(function (a, b) {
    return a.concat(b)
  })
  var data: IVertexData = {
    inferred: false,
    type: ZX.VERTEXTYPES.X,
    label: "",
    radius: 0
  }
  var hull = <coord[]>convexHull(allPoints)
  var h0 = hull[0]
  var h1 = hull[1]
  var he = hull[hull.length - 1]
  var someMid = {
    x: 0.4 * h0.x + 0.3 * h1.x + 0.3 * he.x,
    y: 0.4 * h0.y + 0.3 * h1.y + 0.3 * he.y
  }

  var angleFromMidpoint = function (a: coord) {
    var modifier = 0
    if (a.y < someMid.y) {
      modifier = Math.PI
    }
    return Math.atan((someMid.x - a.x) / (someMid.y - a.y)) + modifier
  }
  var roundTheOutside = hull.sort(function (a, b) {
    var dax = someMid.x - a.x
    var dbx = someMid.x - b.x

    var thetaA = angleFromMidpoint(a)
    var thetaB = angleFromMidpoint(b)

    return thetaA - thetaB
  })
  var outsideArray = roundTheOutside.map(function (a) { return [a.x, a.y] })
  var distanceAB = function (a: coord, b: coord) {
    var dx = a.x - b.x
    var dy = a.y - b.y
    return Math.pow(dx * dx + dy * dy, 0.5)
  }
  var circumference = 0
  var bboxLeft = outsideArray[0][0]
  var bboxRight = outsideArray[0][0]
  var bboxTop = outsideArray[0][1]
  var bboxBottom = outsideArray[0][1]
  var numPoints = outsideArray.length
  var angles: number[] = []
  for (var i = 0; i < outsideArray.length; i++) {
    var previousNode = outsideArray[(i - 1 + numPoints) % numPoints]
    var focusNode = outsideArray[i]
    var nextNode = outsideArray[(i + 1) % numPoints]
    bboxTop = Math.min(bboxTop, focusNode[1])
    bboxBottom = Math.max(bboxBottom, focusNode[1])
    bboxLeft = Math.min(bboxLeft, focusNode[0])
    bboxRight = Math.max(bboxRight, focusNode[0])
    circumference += distanceAB(
      { x: focusNode[0], y: focusNode[1] },
      { x: nextNode[0], y: nextNode[1] })
    var a = [previousNode[0] - focusNode[0], previousNode[1] - focusNode[1]]
    var b = [nextNode[0] - focusNode[0], nextNode[1] - focusNode[1]]
    var la = Math.pow(a[0] * a[0] + a[1] * a[1], 0.5)
    var lb = Math.pow(b[0] * b[0] + b[1] * b[1], 0.5)
    angles.push(Math.acos((a[0] * b[0] + a[1] * b[1]) / (la * lb)))
  }

  // Now examine the angles:
  var anglesDistQuarter = angles.map(function (a) {
    return Math.abs(((a + Math.PI / 2) % (Math.PI / 2)) - (Math.PI / 2))
  })
  var angleSum = anglesDistQuarter.reduce(function (a, b) { return a + b })
  var angleAvg = angleSum / anglesDistQuarter.length

  var startPos = { x: outsideArray[0][0], y: outsideArray[0][1] }
  function areaOfTriangle(a: coord, b: coord, c: coord) {
    return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
  }

  var hullArea = 0;
  for (var i = 1; i < outsideArray.length - 1; i++) {
    hullArea += areaOfTriangle(startPos,
      {
        x: outsideArray[i][0],
        y: outsideArray[i][1]
      },
      {
        x: outsideArray[i + 1][0],
        y: outsideArray[i + 1][1]
      })
  }

  var bboxHeight = bboxBottom - bboxTop
  var bboxWidth = bboxRight - bboxLeft

  var bboxCenter = {
    x: bboxLeft + 0.5 * (bboxRight - bboxLeft),
    y: bboxTop + 0.5 * (bboxBottom - bboxTop)
  }

  var distancesFromMid = outsideArray.map(function (a) {
    return distanceAB({ x: a[0], y: a[1] }, bboxCenter)
  })
  var meanDistanceFromMid = distancesFromMid.reduce(function (a, b) {
    return a + b
  }) / distancesFromMid.length
  var distancesFromMidVariance = distancesFromMid.reduce(function (a, b) {
    return a + Math.pow(b - meanDistanceFromMid, 2)
  }) / distancesFromMid.length


  var bboxPerimeter = 2 * bboxWidth + 2 * bboxHeight
  var diameter = Math.min(bboxWidth, bboxHeight)
  var diagonal = Math.pow(Math.pow(bboxWidth, 2) + Math.pow(bboxHeight, 2), 0.5)
  var circOfPerfectCircle = Math.PI * diameter
  var areaOfPerfectCirle = Math.PI * Math.pow(diameter / 2, 2)
  var areaOfPerfectRect = bboxWidth * bboxHeight
  var circOfNearLine = 2 * diagonal

  var maxDistanceFromMid = distancesFromMid.reduce(function (a, b) {
    return Math.max(a, b)
  })

  var minDistanceFromMid = distancesFromMid.reduce(function (a, b) {
    return Math.min(a, b)
  })
  var distancesFromCirc = distancesFromMid.map(function (a) {
    return a - diameter / 2
  })
  var avgDistanceFromCirc = distancesFromCirc.reduce(function (a, b) {
    return a + b;
  }) / distancesFromCirc.length

  var pointedness = maxDistanceFromMid / minDistanceFromMid

  data.radius = diagonal / 2

  // biasses:
  var rectOverCirc = 0.5
  var circOverLine = 0.5

  var curveNeeded = 0.1

  // Is it square?
  if (Math.min(bboxWidth, bboxHeight) / Math.max(bboxWidth, bboxHeight) > 0.5) {
    // Bounding box is a square:
    // Does it go out to the corner?
    if (pointedness > (curveNeeded + (1 - curveNeeded) * Math.sqrt(2))) {
      // Does it cover a large area?
      if (hullArea > areaOfPerfectCirle) {
        data.type = ZX.VERTEXTYPES.HADAMARD
      } else {
        data.type = ZX.VERTEXTYPES.WIRE
      }
    } else {
      // Doesn't go out to the corner
      data.type = ZX.VERTEXTYPES.Z
    }
  } else {
    // Probably not a square
    data.type = ZX.VERTEXTYPES.WIRE
  }
  return data
}