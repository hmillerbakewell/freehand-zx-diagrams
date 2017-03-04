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
var shortid = require("shortid");
var SVG = require("svgjs");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£');
var uID = (function () {
    function uID() {
        this._id = shortid.generate();
        //idLookup[this.id] = this
    }
    Object.defineProperty(uID.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    return uID;
}());
exports.uID = uID;
//export var idLookup: { [id: string]: any } = []
var DiagramOptions = (function () {
    function DiagramOptions() {
    }
    return DiagramOptions;
}());
exports.DiagramOptions = DiagramOptions;
exports._diagramOptions = new DiagramOptions();
exports._diagramOptions.interpolationDistance = 10;
exports._diagramOptions.closingEdgeLoopDistance = 20;
exports._diagramOptions.closingEdgeVertexDistance = 20;
exports._diagramOptions.closingEdgeEdgeDistance = 20;
var TypedId = (function (_super) {
    __extends(TypedId, _super);
    function TypedId() {
        var _this = _super.call(this) || this;
        // If you see this, then you didn't set a new type in the constructor
        _this._type = "TypedId";
        return _this;
    }
    Object.defineProperty(TypedId.prototype, "type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    return TypedId;
}(uID));
exports.TypedId = TypedId;
var DrawnObject = (function (_super) {
    __extends(DrawnObject, _super);
    function DrawnObject() {
        var _this = _super.call(this) || this;
        _this._type = "DrawnObject";
        return _this;
    }
    return DrawnObject;
}(TypedId));
exports.DrawnObject = DrawnObject;
function interpolate(lambda, a, b) {
    return ((1 - lambda) * a + lambda * b);
}
function posnDistanceSquared(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
}
exports.posnDistanceSquared = posnDistanceSquared;
var Vertex = (function (_super) {
    __extends(Vertex, _super);
    function Vertex(pos) {
        var _this = _super.call(this) || this;
        _this.pos = pos;
        _this.data = "";
        _this.drawn = null;
        _this._type = "Vertex";
        return _this;
    }
    return Vertex;
}(TypedId));
exports.Vertex = Vertex;
var Edge = (function (_super) {
    __extends(Edge, _super);
    function Edge(start, end) {
        var _this = _super.call(this) || this;
        _this.start = new VertexGap(start);
        _this.end = new VertexGap(end);
        _this.data = "";
        _this.drawn = null;
        _this._type = "Edge";
        return _this;
    }
    return Edge;
}(TypedId));
exports.Edge = Edge;
var VertexGap = (function (_super) {
    __extends(VertexGap, _super);
    function VertexGap(pos) {
        var _this = _super.call(this) || this;
        _this.pos = pos;
        _this._type = "VertexGap";
        _this.vertex = null;
        return _this;
    }
    return VertexGap;
}(TypedId));
exports.VertexGap = VertexGap;
var Diagram = (function (_super) {
    __extends(Diagram, _super);
    function Diagram() {
        var _this = _super.call(this) || this;
        _this.listeners = [];
        _this.subscribe = function (handler) {
            _this.listeners.push(handler);
        };
        _this.fireChange = function () {
            for (var _i = 0, _a = _this.listeners; _i < _a.length; _i++) {
                var l = _a[_i];
                l.upstreamChange();
            }
        };
        _this.importEdge = function (edge) {
            _this.edges.push(edge);
            _this.fillVertexGaps();
            _this.fireChange();
        };
        _this.importVertex = function (vertex) {
            _this.vertices.push(vertex);
            _this.fillVertexGaps();
            _this.fireChange();
        };
        _this.importRewriteDiagram = function (diagram) {
            _this.edges = [];
            _this.vertices = [];
            _this.inferredVertices = [];
            _this.refreshGapList();
            for (var _i = 0, _a = diagram.edges; _i < _a.length; _i++) {
                var edge = _a[_i];
                _this.edges.push(edge);
            }
            for (var _b = 0, _c = diagram.vertices; _b < _c.length; _b++) {
                var vertex = _c[_b];
                _this.vertices.push(vertex);
            }
            _this.fillVertexGaps();
            _this.fireChange();
        };
        _this._type = "Diagram";
        _this.edges = [];
        _this.vertices = [];
        _this.inferredVertices = [];
        _this.unpluggedVertexGaps = [];
        return _this;
    }
    Diagram.prototype.refreshGapList = function () {
        this.unpluggedVertexGaps = [];
        for (var _i = 0, _a = this.edges; _i < _a.length; _i++) {
            var edge = _a[_i];
            if (edge.start.vertex === null) {
                this.unpluggedVertexGaps.push(edge.start);
            }
            if (edge.end.vertex === null) {
                this.unpluggedVertexGaps.push(edge.end);
            }
        }
    };
    Diagram.prototype.emptyVertexGaps = function () {
        for (var _i = 0, _a = this.unpluggedVertexGaps; _i < _a.length; _i++) {
            var gap = _a[_i];
            gap.vertex = null;
        }
        this.inferredVertices = [];
    };
    Diagram.prototype.fillVertexGaps = function () {
        //First get list of vertexGaps
        this.emptyVertexGaps();
        this.refreshGapList();
        // For each vertexGap compare distances to each vertex
        for (var _i = 0, _a = this.unpluggedVertexGaps; _i < _a.length; _i++) {
            var gap = _a[_i];
            var closestDist = Math.pow(exports._diagramOptions.closingEdgeVertexDistance, 2) + 1;
            var dist = 0;
            for (var _b = 0, _c = this.vertices; _b < _c.length; _b++) {
                var vx = _c[_b];
                dist = posnDistanceSquared(gap.pos, vx.pos);
                if (dist < closestDist) {
                    closestDist = dist;
                    // Claim closest valid vertex
                    gap.vertex = vx;
                }
            }
        }
        this.refreshGapList();
        dist = 0;
        // For each remaining vertexGap, compare to other vertexGaps
        for (var i = 0; i < this.unpluggedVertexGaps.length; i++) {
            var closestDist = Math.pow(exports._diagramOptions.closingEdgeEdgeDistance, 2) + 1;
            var gap1 = this.unpluggedVertexGaps[i];
            for (var j = i + 1; j < this.unpluggedVertexGaps.length; j++) {
                var gap2 = this.unpluggedVertexGaps[j];
                // Check they are not already filled
                if (gap1.vertex === null && gap2.vertex === null) {
                    dist = posnDistanceSquared(gap1.pos, gap2.pos);
                    if (dist < closestDist) {
                        closestDist = dist;
                        // Claim closest valid vertex
                        var midpoint = [interpolate(0.5, gap1.pos.x, gap2.pos.x), interpolate(0.5, gap1.pos.y, gap2.pos.y)];
                        var vx = new Vertex({ x: midpoint[0], y: midpoint[1] });
                        this.inferredVertices.push(vx);
                        gap1.vertex = vx;
                        gap2.vertex = vx;
                    }
                }
            }
            // If, at the end, no other vertexGaps were close, then create a new vertex.
            if (gap1.vertex === null) {
                var vx = new Vertex(gap1.pos);
                gap1.vertex = vx;
                this.inferredVertices.push(vx);
            }
        }
    };
    Diagram.prototype.toSVGDrawing = function (svgIdentifier) {
        var svg_holder = SVG(svgIdentifier);
        var edge_group = svg_holder.group();
        for (var _i = 0, _a = this.edges; _i < _a.length; _i++) {
            var edge = _a[_i];
            edge_group.path(edge.drawn.waypoints.join(" "));
        }
    };
    return Diagram;
}(TypedId));
exports.Diagram = Diagram;
