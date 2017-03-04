"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var DiagramIO = require("./freehand-io.js");
var ZXSVGIOModule = (function (_super) {
    __extends(ZXSVGIOModule, _super);
    function ZXSVGIOModule(targetDiagram) {
        var _this = _super.call(this, targetDiagram) || this;
        _this.upstreamChange = _this.onDiagramChange;
        _this.targetDiagram.subscribe(_this);
        return _this;
    }
    ZXSVGIOModule.prototype.onDiagramChange = function () {
        this.toZXSVG();
    };
    ZXSVGIOModule.prototype.toZXSVG = function () {
        if (this.SVG) {
            var svg = this.SVG;
            svg.size(600, 600);
            svg.clear();
            var s = "";
            //First user-created vertices
            var coloursDict = {};
            coloursDict["X"] = "red";
            coloursDict["Z"] = "green";
            for (var _i = 0, _a = this.targetDiagram.vertices; _i < _a.length; _i++) {
                var vertex = _a[_i];
                var c = svg.circle(10);
                c.cx(vertex.pos.x);
                c.cy(vertex.pos.y);
                if (!vertex.data || vertex.data == "") {
                    vertex.data = "X";
                }
                c.fill(coloursDict[vertex.data[0]]);
            }
            //Now count the degree of each inferred vertex
            var degreeById = {};
            var inc = function (id) { return (degreeById[id] = degreeById[id] ? degreeById[id] + 1 : 1); };
            for (var _b = 0, _c = this.targetDiagram.edges; _b < _c.length; _b++) {
                edge = _c[_b];
                inc(edge.start.vertex.id);
                inc(edge.end.vertex.id);
            }
            //Then inferred vertices
            for (var _d = 0, _e = this.targetDiagram.inferredVertices; _d < _e.length; _d++) {
                var vertex = _e[_d];
                var vertexType = "";
                var degree = (degreeById[vertex.id] || 0);
                switch (degree) {
                    case 0:
                        vertexType = "orphan";
                        break;
                    case 1:
                        vertexType = "input";
                        var r = svg.rect(10, 10);
                        r.x(vertex.pos.x - 5);
                        r.y(vertex.pos.y - 5);
                        break;
                    case 2:
                        vertexType = "wire";
                        break;
                    default:
                        vertexType = "error";
                        break;
                }
            }
            //Then edges
            for (var _f = 0, _g = this.targetDiagram.edges; _f < _g.length; _f++) {
                var edge = _g[_f];
                var posns = [edge.start.vertex.pos.x,
                    edge.start.vertex.pos.y,
                    edge.end.vertex.pos.x,
                    edge.end.vertex.pos.y];
                svg.path("M" + posns[0] + "," + posns[1] + " L" + posns[2] + "," + posns[3])
                    .fill("transparent")
                    .stroke("black");
            }
        }
    };
    return ZXSVGIOModule;
}(DiagramIO.DiagramIOHTMLModule));
exports.ZXSVGIOModule = ZXSVGIOModule;
