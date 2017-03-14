import Diagrams = require("./diagrams.js")
import IO = require("./diagrams-io.js")
import ZX = require("./zx-theory.js")

// Diagram data

/** Coordianate scheme to use */
export type ICoord = Diagrams.IDiagramPosition

/** Vertex data, including rendering data */
export type IVertexData = ZX.IVertexData & IO.ISVGVertexData

/** Edge data, including rendering data */
export type IEdgeData = ZX.IEdgeData & IO.ISVGEdgeData

// IO modules

/** Basic HTML IO module */
export class HTMLModule extends IO.DiagramIOHTMLModule { }

// SVG

/** Data for drawing a path */
export type ISVGPath = IO.ISVGPath

/** Data for drawing a rextangle */
export type ISVGRect = IO.ISVGRect

/** Data for drawing a circle */
export type ISVGCircle = IO.ISVGCircle

/** Is the object inferred or given explicitly */
export type IInferrable = IO.IDataInferred

/** Default radius to use */
export let defaultRadius = 10