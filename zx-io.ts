import Diagrams = require("./diagrams.js")
import SVG = require("svgjs")
import pathInterpolate = require("path-interpolate")
import $ = require("jquery")
import IO = require("./diagrams-io.js")
import ZX = require("./zx-theory.js")

export type IVertexData = ZX.IVertexData & IO.ISVGVertexData
export type IEdgeData = ZX.IEdgeData & IO.ISVGEdgeData

export class HTMLModule extends IO.DiagramIOHTMLModule { }

export type ISVGPath = IO.ISVGPath
export type ISVGRect = IO.ISVGRect
export type ISVGCircle = IO.ISVGCircle

export type IInferrable = IO.IDataInferred