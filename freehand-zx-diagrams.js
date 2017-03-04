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
var pathInterpolate = require("path-interpolate");
var shortid = require("shortid");
var SVG = require("svgjs");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_£');
var uID = (function () {
    function uID() {
        this.id = shortid.generate();
        //idLookup[this.id] = this
    }
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
exports._diagramOptions.closingEdgeVertexDistance = 30;
exports._diagramOptions.closingEdgeEdgeDistance = 20;
var TypedId = (function (_super) {
    __extends(TypedId, _super);
    function TypedId() {
        var _this = _super.call(this) || this;
        // If you see this, then you didn't set a new type in the constructor
        _this.type = "TypedId";
        return _this;
    }
    return TypedId;
}(uID));
exports.TypedId = TypedId;
var DrawnObject = (function (_super) {
    __extends(DrawnObject, _super);
    function DrawnObject() {
        var _this = _super.call(this) || this;
        _this.type = "DrawnObject";
        return _this;
    }
    return DrawnObject;
}(TypedId));
exports.DrawnObject = DrawnObject;
var DiagramPosition = (function () {
    function DiagramPosition(xyArray) {
        this.x = 0;
        this.y = 0;
        this.x = xyArray[0];
        this.y = xyArray[1];
    }
    return DiagramPosition;
}());
exports.DiagramPosition = DiagramPosition;
function posnDistanceSquared(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
}
var Vertex = (function (_super) {
    __extends(Vertex, _super);
    function Vertex(pos) {
        var _this = _super.call(this) || this;
        _this.pos = pos;
        _this.data = "";
        _this.drawn = null;
        _this.type = "Vertex";
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
        _this.type = "Edge";
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
        _this.type = "VertexGap";
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
        _this.type = "Diagram";
        _this.edges = [];
        _this.vertices = [];
        _this.inferredVertices = [];
        _this.unpluggedVertexGaps = [];
        return _this;
    }
    Diagram.prototype.addPath = function (path) {
        var obj = pathToObject(path);
        if (obj.type === "Edge") {
            this.edges.push(obj);
        }
        else {
            this.vertices.push(obj);
        }
        return obj;
    };
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
        var closestDist = Math.pow(exports._diagramOptions.closingEdgeEdgeDistance, 2) + 1;
        dist = 0;
        // For each remaining vertexGap, compare to other vertexGaps
        for (var i = 0; i < this.unpluggedVertexGaps.length; i++) {
            var gap1 = this.unpluggedVertexGaps[i];
            for (var j = i + 1; j < this.unpluggedVertexGaps.length; j++) {
                var gap2 = this.unpluggedVertexGaps[j];
                // Check they are not already filled
                if (gap1.vertex !== null && gap2.vertex !== null) {
                    dist = posnDistanceSquared(gap1.pos, gap2.pos);
                    if (dist < closestDist) {
                        closestDist = dist;
                        // Claim closest valid vertex
                        var midpoint = [pathInterpolate.interpolate(0.5, gap1.pos.x, gap2.pos.x), pathInterpolate.interpolate(0.5, gap1.pos.y, gap2.pos.y)];
                        var vx = new Vertex(new DiagramPosition(midpoint));
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
    Diagram.prototype.toSimpleGraph = function () {
        this.fillVertexGaps();
        var output = {
            node_vertices: {},
            undir_edges: {},
            wire_vertices: {}
        };
        //First user-created vertices
        for (var _i = 0, _a = this.vertices; _i < _a.length; _i++) {
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
        for (var _b = 0, _c = this.edges; _b < _c.length; _b++) {
            edge = _c[_b];
            inc(edge.start.vertex.id);
            inc(edge.end.vertex.id);
        }
        //Then inferred vertices
        for (var _d = 0, _e = this.inferredVertices; _d < _e.length; _d++) {
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
        for (var _f = 0, _g = this.edges; _f < _g.length; _f++) {
            var edge = _g[_f];
            output.undir_edges[edge.id] = {
                src: edge.start.vertex.id,
                tgt: edge.end.vertex.id
            };
        }
        return JSON.stringify(output);
    };
    return Diagram;
}(TypedId));
exports.Diagram = Diagram;
function pathToPosnList(path) {
    var posnList = [];
    for (var i = 0; i < path.length; i++) {
        posnList.push(new DiagramPosition(path[i]));
    }
    return posnList;
}
function pathToObject(pathAsString) {
    var interpolatedPath = pathInterpolate(pathAsString, exports._diagramOptions.interpolationDistance);
    var dO = new DrawnObject();
    dO.start = interpolatedPath.start;
    dO.end = interpolatedPath.end;
    dO.length = interpolatedPath.length;
    dO.bbox = interpolatedPath.bbox;
    dO.waypoints = interpolatedPath.waypoints;
    var pathAsPositions = pathToPosnList(interpolatedPath.waypoints);
    var itIsAnEdge = true;
    // Is it closed?
    var start = new DiagramPosition(interpolatedPath.start);
    var end = new DiagramPosition(interpolatedPath.end);
    if (posnDistanceSquared(start, end) < Math.pow(exports._diagramOptions.closingEdgeLoopDistance, 2)) {
        itIsAnEdge = false;
    }
    var r; // result
    if (itIsAnEdge) {
        r = new Edge(start, end);
    }
    else {
        var midpointX = interpolatedPath.bbox[0] + (interpolatedPath.bbox[2] / 2);
        var midpointY = interpolatedPath.bbox[1] + (interpolatedPath.bbox[3] / 2);
        r = new Vertex(new DiagramPosition([midpointX, midpointY]));
    }
    r.drawn = dO;
    return r;
}
