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
            svg.size(500, 500);
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
                var pathCommand = "";
                pathCommand += "M" + edge.start.vertex.pos.x + " " + edge.start.vertex.pos.y + " ";
                if (edge.data.RDPWaypoints) {
                    var smoothingFactor = 20;
                    var tangents = [];
                    var normaliseAndPushToTangents = function (x, y) {
                        var tNorm = {
                            x: 0,
                            y: 0
                        };
                        var d = 0;
                        d = Math.pow(x * x + y * y, 0.5);
                        if (d > 0) {
                            tNorm = {
                                x: x / d,
                                y: y / d
                            };
                        }
                        tangents.push(tNorm);
                        return tNorm;
                    };
                    var waypoints = edge.data.RDPWaypoints;
                    // Calculate tangents:
                    // vertex start -> waypoint 0
                    normaliseAndPushToTangents(waypoints[0].x - edge.start.pos.x, waypoints[0].y - edge.start.pos.y);
                    // waypoint i -> waypoint i+1
                    for (var i = 1; i < waypoints.length - 1; i++) {
                        normaliseAndPushToTangents(waypoints[i + 1].x - waypoints[i - 1].x, waypoints[i + 1].y - waypoints[i - 1].y);
                    }
                    // waypoint last -> vertex end
                    normaliseAndPushToTangents(edge.end.pos.x - waypoints[i].x, edge.end.pos.y - waypoints[i].y);
                    //Calculate path data:
                    // vertex start -> waypoint 0
                    pathCommand += "L " + waypoints[0].x + " " + waypoints[0].y + " ";
                    // waypoint 0 -> waypoint 1
                    pathCommand += "C " + (waypoints[0].x + tangents[0].x * smoothingFactor) + " " + (waypoints[0].y + tangents[0].y * smoothingFactor) + ", ";
                    pathCommand += waypoints[1].x - tangents[1].x * smoothingFactor + " " + (waypoints[1].y - tangents[1].y * smoothingFactor) + ", ";
                    pathCommand += waypoints[1].x + " " + waypoints[1].y + " ";
                    // waypoint i -> waypoint i+1
                    for (var i = 1; i < waypoints.length - 1; i++) {
                        pathCommand += "S " + (waypoints[i + 1].x - tangents[i + 1].x * smoothingFactor) + " ";
                        pathCommand += waypoints[i + 1].y - tangents[i + 1].y * smoothingFactor + ", ";
                        pathCommand += waypoints[i + 1].x + " " + waypoints[i + 1].y + " ";
                    }
                    // waypoint last -> vertex end
                    pathCommand += "L " + edge.end.pos.x + " " + edge.end.pos.y + " ";
                }
                svg.path(pathCommand)
                    .fill("transparent")
                    .stroke("black");
            }
        }
    };
    return ZXSVGIOModule;
}(DiagramIO.DiagramIOHTMLModule));
exports.ZXSVGIOModule = ZXSVGIOModule;
