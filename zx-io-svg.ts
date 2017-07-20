import Diagrams = require("./diagrams")
import SVG = require("svgjs")
import pathInterpolate = require("./path-interpolate")
import waypointsToSmoothPath = require("./waypoints-to-smooth-path")
import $ = require("jquery")
import ZX = require("./zx-theory")
import ZXIO = require("./zx-io")

/** IO module for SVG rendering of a diagram */
export class ZXSVGIOModule extends ZXIO.HTMLModule {
  constructor() {
    super()
    this.internalDiagram = new Diagrams.Diagram()
  }

  /** Overwrite internal data with new diagram */
  importRewriteDiagram: (diagram: Diagrams.IDiagramOutput) => void
  = (diagram) => {
    this.internalDiagram.importRewriteDiagram(diagram)
    this.toZXSVG(this.internalDiagram)
    this.outputDiagram.importRewriteDiagram(this.internalDiagram)
  }
  private internalDiagram: Diagrams.Diagram

  /** Fires when an element is clickes */
  clickedElement: (e: MouseEvent) => void = (e) => {
    e.preventDefault()
    if ((<any>e.srcElement).dataset) {
      var clickedID = (<any>e.srcElement).dataset["id"]
    }
    var getElementById: (id: string) => (Diagrams.Edge | Diagrams.Vertex)
      = (id) => {
        if (this.internalDiagram.edgeById[id]) {
          return this.internalDiagram.edgeById[id]
        } else if (this.internalDiagram.vertexById[id]) {
          return this.internalDiagram.vertexById[id]
        } else {
          return null
        }
      }
    if (clickedID) {
      var ele = getElementById(clickedID)
      if (ele && ele.type === "Vertex") {
        var dv = <ZX.IVertexData>ele.data
        if (dv.type === ZX.VERTEXTYPES.Z) {
          dv.type = ZX.VERTEXTYPES.X
        } else if (dv.type === ZX.VERTEXTYPES.X) {
          dv.type = ZX.VERTEXTYPES.HADAMARD
        } else if (dv.type === ZX.VERTEXTYPES.HADAMARD) {
          dv.type = ZX.VERTEXTYPES.Z
        }
        this.toZXSVG(this.internalDiagram)
        this.outputDiagram.importRewriteDiagram(this.internalDiagram)
      } else if (ele && ele.type === "Edge") {

      }
    }
  }
  SVG: SVG.Container

  /** Renders the given diagram */
  toZXSVG: (diagram: Diagrams.IDiagramOutput) => void
  = (diagram) => {
    ZXToSVG(
      diagram,
      this.SVG,
      this.clickedElement)
  }
}

/**
 * Render to the given diagram into SVG
 * @param diagram Diagram to render
 * @param svgContainer SVG element on which to render
 * @param clickHandler Event handler for clicking on an object
 */
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
    if ((<ZXIO.IEdgeData>edge.data).RDPWaypoints) {
      var waypoints = (<ZXIO.IEdgeData>edge.data).RDPWaypoints
      // Calculate tangents:
      // vertex start -> waypoint 0

      pathCommand += waypointsToSmoothPath.smooth([startPos]
        .concat(waypoints)
        .concat([endPos]))

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
      var vdata = <ZXIO.IVertexData>vertex.data
      var radius = ZXIO.defaultRadius
      switch (vdata.type) {
        case ZX.VERTEXTYPES.INPUT:
        case ZX.VERTEXTYPES.OUTPUT:
        case ZX.VERTEXTYPES.WIRE:
          var r = svgContainer.rect(radius, radius) // HALF SIZE!
          r.x(vertex.pos.x - radius / 2)
          r.y(vertex.pos.y - radius / 2)
          r.fill(coloursDict[vdata.type])
            .data("type", (<ZX.IVertexData>vertex.data).type)
            .data("id", vertex.id)
            .click(clickHandler)
          idToElement[vertex.id] = vertex
          break;

        case ZX.VERTEXTYPES.X:
        case ZX.VERTEXTYPES.Z:
          var c = svgContainer.circle(2 * radius)
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
          var r = svgContainer.rect(2 * radius, 2 * radius)
          r.x(vertex.pos.x - radius)
          r.y(vertex.pos.y - radius)
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
