import Diagrams = require("./freehand-diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import DiagramIO = require("./freehand-io.js")
import ZX = require("./theory-ZX.js")

export class ZXSVGIOModule extends DiagramIO.DiagramIOHTMLModule {
  constructor(
    upstreamDiagram: Diagrams.IDiagramOutput & Diagrams.IStreamCaller,
    downstreamDiagram: Diagrams.IDiagramInput) {
    super(downstreamDiagram, upstreamDiagram)
    this.upstreamChange = this.onDiagramChange
    this.upstreamDiagram.subscribe(this)
  }
  onDiagramChange() {
    this.toZXSVG()
  }
  clickedElement: (e: MouseEvent) => void = (e) => {
    e.preventDefault()
    if ((<any>e.srcElement).dataset) {
      var clickedID = (<any>e.srcElement).dataset["id"]
    }
    if (clickedID) {
      var ele = this.idToElement[clickedID]
      if (ele.type === "Vertex") {
        var dv = <ZX.IVertexData>ele.data
        if (dv.type === ZX.VERTEXTYPES.Z) {
          dv.type = ZX.VERTEXTYPES.X
        } else if (dv.type === ZX.VERTEXTYPES.X) {
          dv.type = ZX.VERTEXTYPES.HADAMARD
        } else if (dv.type === ZX.VERTEXTYPES.HADAMARD) {
          dv.type = ZX.VERTEXTYPES.Z
        }
        this.downstreamDiagram.fireChange()
      } else if (ele.type === "Edge") {

      }
    }
  }
  idToElement: { [index: string]: (Diagrams.Vertex | Diagrams.Edge) } = {}
  SVG: SVG.Container
  toZXSVG() {
    this.idToElement = ZXToSVG(
      this.upstreamDiagram,
      this.SVG,
      this.clickedElement)
  }
}


export function ZXToSVG(diagram: Diagrams.IDiagramOutput,
  svgContainer: SVG.Container,
  clickHandler: (e: MouseEvent) => void) {

  svgContainer.clear()
  var s = ""
  var idToElement: { [id: string]: (Diagrams.Vertex | Diagrams.Edge) } = {}
  var vertexByID: { [id: string]: Diagrams.Vertex } = {}
  for (var vertex of diagram.vertices) {
    vertexByID[vertex.id] = vertex
  }

  // Edges
  for (var edge of diagram.edges) {
    let startPos = vertexByID[edge.start].pos
    let endPos = vertexByID[edge.end].pos
    var pathCommand = ""
    pathCommand += `M${startPos.x} ${startPos.y} `
    if ((<DiagramIO.IFreehandOnSVGEdge>edge.data).RDPWaypoints) {
      var smoothingFactor = 20
      var tangents: Diagrams.IDiagramPosition[] = []
      var normaliseAndPushToTangents = function (x: number, y: number) {

        var tNorm: Diagrams.IDiagramPosition = {
          x: 0,
          y: 0
        }
        let d = 0
        d = Math.pow(x * x + y * y, 0.5)
        if (d > 0) {
          tNorm = {
            x: x / d,
            y: y / d
          }
        }
        tangents.push(tNorm)
        return tNorm
      }
      var waypoints = (<DiagramIO.IFreehandOnSVGEdge>edge.data).RDPWaypoints
      // Calculate tangents:
      // vertex start -> waypoint 0
      if (waypoints.length == 0) {
        waypoints[0] = startPos
        waypoints[1] = endPos
      }
      normaliseAndPushToTangents(
        waypoints[0].x - startPos.x, waypoints[0].y - startPos.y
      )
      // waypoint i -> waypoint i+1

      for (var i = 1; i < waypoints.length - 1; i++) {
        normaliseAndPushToTangents(
          waypoints[i + 1].x - waypoints[i - 1].x,
          waypoints[i + 1].y - waypoints[i - 1].y
        )
      }
      // waypoint last -> vertex end
      normaliseAndPushToTangents(
        endPos.x - waypoints[i].x,
        endPos.y - waypoints[i].y
      )

      //Calculate path data:
      // vertex start -> waypoint 0
      pathCommand += `L ${waypoints[0].x} ${waypoints[0].y} `
      // waypoint 0 -> waypoint 1
      var c1x = waypoints[0].x + tangents[0].x * smoothingFactor
      var c1y = waypoints[0].y + tangents[0].y * smoothingFactor
      var c2x = waypoints[1].x - tangents[1].x * smoothingFactor
      var c2y = waypoints[1].y - tangents[1].y * smoothingFactor
      var c3x = waypoints[1].x
      var c3y = waypoints[1].y
      pathCommand +=
        `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${c3x} ${c3y} `
      // waypoint i -> waypoint i+1
      for (var i = 1; i < waypoints.length - 1; i++) {
        pathCommand +=
          `S ${waypoints[i + 1].x - tangents[i + 1].x * smoothingFactor} `
        pathCommand +=
          `${waypoints[i + 1].y - tangents[i + 1].y * smoothingFactor}, `
        pathCommand +=
          `${waypoints[i + 1].x} ${waypoints[i + 1].y} `
      }
      // waypoint last -> vertex end
      pathCommand += `L ${endPos.x} ${endPos.y} `

    }
    svgContainer.path(pathCommand)
      .fill("transparent")
      .stroke("black")
      .data("type", (<ZX.IEdgeData>edge.data).type)
      .data("id", edge.id)
      .click(clickHandler)
    idToElement[edge.id] = edge
  }
  // Vertices
  var coloursDict: { [id: string]: string } = {}
  coloursDict[ZX.VERTEXTYPES.X] = "red"
  coloursDict[ZX.VERTEXTYPES.Z] = "green"
  coloursDict[ZX.VERTEXTYPES.HADAMARD] = "yellow"
  coloursDict[ZX.VERTEXTYPES.INPUT] = "black"
  coloursDict[ZX.VERTEXTYPES.OUTPUT] = "black"
  coloursDict[ZX.VERTEXTYPES.WIRE] = "grey"

  for (var vertex of diagram.vertices) {
    if (vertex.data) {
      var vdata = <ZX.IVertexData>vertex.data
      switch (vdata.type) {
        case ZX.VERTEXTYPES.INPUT:
        case ZX.VERTEXTYPES.OUTPUT:
        case ZX.VERTEXTYPES.WIRE:
          var r = svgContainer.rect(5, 5)
          r.x(vertex.pos.x - 2.5)
          r.y(vertex.pos.y - 2.5)
          r.fill(coloursDict[vdata.type])
            .data("type", (<ZX.IVertexData>vertex.data).type)
            .data("id", vertex.id)
            .click(clickHandler)
          idToElement[vertex.id] = vertex
          break;

        case ZX.VERTEXTYPES.X:
        case ZX.VERTEXTYPES.Z:
          var c = svgContainer.circle(10)
          c.cx(vertex.pos.x)
          c.cy(vertex.pos.y)
          c.fill(coloursDict[vdata.type])
            .data("type", (<ZX.IVertexData>vertex.data).type)
            .data("id", vertex.id)
            .click(clickHandler)
            .stroke({ color: "black", width: 1 })
          idToElement[vertex.id] = vertex
          break;
        case ZX.VERTEXTYPES.HADAMARD:
          var r = svgContainer.rect(10, 10)
          r.x(vertex.pos.x - 5)
          r.y(vertex.pos.y - 5)
          r.fill(coloursDict[vdata.type])
            .data("type", (<ZX.IVertexData>vertex.data).type)
            .data("id", vertex.id)
            .click(clickHandler)
            .stroke({ color: "black", width: 1 })
          idToElement[vertex.id] = vertex
          break;
      }
    }
  }
  return idToElement
}
