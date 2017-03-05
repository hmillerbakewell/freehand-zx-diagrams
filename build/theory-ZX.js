// A graphical theory schematic lists the vertex-types and edge-types allowed in theory
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EDGETYPES;
(function (EDGETYPES) {
    EDGETYPES[EDGETYPES["PLAIN"] = 0] = "PLAIN";
})(EDGETYPES = exports.EDGETYPES || (exports.EDGETYPES = {}));
var VERTEXTYPES;
(function (VERTEXTYPES) {
    VERTEXTYPES[VERTEXTYPES["Z"] = 0] = "Z";
    VERTEXTYPES[VERTEXTYPES["X"] = 1] = "X";
    VERTEXTYPES[VERTEXTYPES["HADAMARD"] = 2] = "HADAMARD";
    VERTEXTYPES[VERTEXTYPES["WIRE"] = 3] = "WIRE";
    VERTEXTYPES[VERTEXTYPES["INPUT"] = 4] = "INPUT";
    VERTEXTYPES[VERTEXTYPES["OUTPUT"] = 5] = "OUTPUT";
})(VERTEXTYPES = exports.VERTEXTYPES || (exports.VERTEXTYPES = {}));
