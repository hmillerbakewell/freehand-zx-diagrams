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
var Diagrams = require("./freehand-zx-diagrams.js");
var SVG = require("svgjs");
var pathInterpolate = require("path-interpolate");
var DiagramIO = require("./freehand-io.js");
var FreehandOnSVGIOModule = (function (_super) {
    __extends(FreehandOnSVGIOModule, _super);
    function FreehandOnSVGIOModule(targetDiagram) {
        var _this = _super.call(this, targetDiagram) || this;
        _this.mousedown = function (e) {
            var cursor = _this.cursor(e);
            _this.startPath();
            _this.takeInput = true;
            _this.addPoint(cursor.x, cursor.y);
        };
        _this.mouseup = function (e) {
            var cursor = _this.cursor(e);
            _this.addPoint(cursor.x, cursor.y);
            _this.endPath();
            _this.takeInput = false;
        };
        _this.mousemove = function (e) {
            var cursor = _this.cursor(e);
            _this.addPoint(cursor.x, cursor.y);
        };
        _this.createSVG = function (selector) {
            _this.svgElement = SVG(selector).style("border: 1px solid black");
            _this.svgElement.size(600, 600).viewbox(); // TODO viewbox
            // Mouse events
            _this.svgElement.mousedown(_this.mousedown);
            _this.svgElement.mouseup(_this.mouseup);
            _this.svgElement.mousemove(_this.mousemove);
        };
        _this.cursor = function (e) {
            _this.mousePos = new SVG.Point(e.clientX, e.clientY);
            if (_this.svgElement) {
                var transcribedPoint = _this.mousePos.transform(_this.svgElement.screenCTM().inverse());
                return transcribedPoint.native();
            }
            else {
                return _this.mousePos.native();
            }
        };
        _this.addPoint = function (x, y) {
            _this.lastTimeTriggered = (new Date()).getMilliseconds();
            if (_this.takeInput) {
                var round = function (x, accuracy) {
                    return Math.round(x * accuracy) / accuracy;
                };
                var s = _this.currentPath.length === 0 ? "M" : "L";
                s += round(x, _this.accuracyScale);
                s += ", ";
                s += round(y, _this.accuracyScale);
                s += " ";
                _this.currentPath += s;
                _this.svgElement.path(_this.currentPath).stroke("black").fill("transparent");
            }
        };
        _this.startPath = function () {
            _this.currentPath = "";
        };
        _this.endPath = function () {
            var s = _this.currentPath;
            _this.paths.push(s);
            _this.currentPath = "";
            _this.takeInput = false;
            _this.drawAllShapes();
            if (_this._targetDiagram) {
                var pathAsObj = _this.pathToObject(s);
                if (pathAsObj.type === "Edge") {
                    _this._targetDiagram.importEdge(pathAsObj);
                }
                else if (pathAsObj.type === "Vertex") {
                    _this._targetDiagram.importVertex(pathAsObj);
                }
            }
        };
        _this.pathToObject = function (pathAsString) {
            pathAsString = pathAsString
                .replace(/[a-zA-Z]/g, '')
                .replace(/[\s,]+/g, ' ')
                .trim();
            var interpolatedPath = pathInterpolate(pathAsString, Diagrams._diagramOptions.interpolationDistance);
            if (interpolatedPath.length > 10) {
                var dO = new Diagrams.DrawnObject();
                dO.start = interpolatedPath.start;
                dO.end = interpolatedPath.end;
                dO.length = interpolatedPath.length;
                dO.bbox = interpolatedPath.bbox;
                dO.waypoints = interpolatedPath.waypoints;
                var pathAsPositions = pathToPosnList(interpolatedPath.waypoints);
                var itIsAnEdge = true;
                // Is it closed?
                var start = { x: interpolatedPath.start[0], y: interpolatedPath.start[1] };
                var end = { x: interpolatedPath.end[0], y: interpolatedPath.end[1] };
                if (Diagrams.posnDistanceSquared(start, end) < Math.pow(_this.closingVertexDistance, 2)) {
                    itIsAnEdge = false;
                }
                var r; // result
                if (itIsAnEdge) {
                    r = new Diagrams.Edge(start, end);
                }
                else {
                    var midpointX = interpolatedPath.bbox[0] + (interpolatedPath.bbox[2] / 2);
                    var midpointY = interpolatedPath.bbox[1] + (interpolatedPath.bbox[3] / 2);
                    r = new Diagrams.Vertex({ x: midpointX, y: midpointY });
                }
                r.drawn = dO;
                return r;
            }
            else {
                return null;
            }
        };
        _this.drawAllShapes = function () {
            var svg = _this.svgElement;
            svg.clear();
            for (var shape in _this.paths) {
                var pathDrawn = _this.paths[shape];
                if (pathDrawn !== null && pathDrawn.length > 0) {
                    svg.path(pathDrawn).stroke("black").fill("transparent");
                }
            }
        };
        _this.takeInput = false;
        _this.currentPath = "";
        _this.paths = [];
        _this.accuracyScale = 1;
        _this.svgElement = null;
        _this.lastTimeTriggered = (new Date()).getMilliseconds();
        _this.mousePos = new SVG.Point(0, 0);
        _this.closingVertexDistance = 10;
        return _this;
    }
    return FreehandOnSVGIOModule;
}(DiagramIO.DiagramIOHTMLModule));
exports.FreehandOnSVGIOModule = FreehandOnSVGIOModule;
function pathToPosnList(path) {
    var posnList = [];
    for (var i = 0; i < path.length; i++) {
        posnList.push({ x: path[i][0], y: path[i][1] });
    }
    return posnList;
}
