"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Diagrams = require("./freehand-zx-diagrams.js");
var D = new Diagrams.Diagram();
var testPaths = [];
testPaths.push("0,0 10,0 10,10 0,10");
testPaths.push("5,5 95,95");
testPaths.push("90,90 100,90 100,100 90,100");
testPaths.push("0,0 0,100");
for (var _i = 0, testPaths_1 = testPaths; _i < testPaths_1.length; _i++) {
    var p = testPaths_1[_i];
    D.addPath(p);
}
D.fillVertexGaps();
console.log(JSON.stringify(D));
