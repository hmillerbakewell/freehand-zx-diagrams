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
var $ = require("jquery");
var DiagramIO = require("./freehand-io.js");
var ZXJSONIOModule = (function (_super) {
    __extends(ZXJSONIOModule, _super);
    function ZXJSONIOModule(targetDiagram) {
        var _this = _super.call(this, targetDiagram) || this;
        _this.upstreamChange = _this.onDiagramChange;
        _this.targetDiagram.subscribe(_this);
        return _this;
    }
    ZXJSONIOModule.prototype.onDiagramChange = function () {
        $(this.UISelector).html(JSON.stringify(JSON.parse(this.toSimpleZXGraph()), undefined, 2));
    };
    ZXJSONIOModule.prototype.toSimpleZXGraph = function () {
        var output = {
            node_vertices: {},
            undir_edges: {},
            wire_vertices: {}
        };
        //First user-created vertices
        for (var _i = 0, _a = this.targetDiagram.vertices; _i < _a.length; _i++) {
            var vertex = _a[_i];
            output.node_vertices[vertex.id] = {
                "data": {
                    "type": "X",
                    "value": ""
                },
                "annotation": {
                    "coord": [vertex.pos.x, vertex.pos.y]
                }
            };
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
                    break;
                case 2:
                    vertexType = "wire";
                    break;
                default:
                    vertexType = "error";
                    break;
            }
            output.wire_vertices[vertex.id] = {
                "annotation": {
                    "boundary": (degree === 1),
                    "coord": [vertex.pos.x, vertex.pos.y]
                }
            };
        }
        //Then edges
        for (var _f = 0, _g = this.targetDiagram.edges; _f < _g.length; _f++) {
            var edge = _g[_f];
            output.undir_edges[edge.id] = {
                src: edge.start.vertex.id,
                tgt: edge.end.vertex.id
            };
        }
        return JSON.stringify(output);
    };
    return ZXJSONIOModule;
}(DiagramIO.DiagramIOHTMLModule));
exports.ZXJSONIOModule = ZXJSONIOModule;
