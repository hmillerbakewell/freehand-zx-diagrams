import Diagrams = require("./freehand-zx-diagrams.js")

var D = new Diagrams.Diagram()
let testPaths = []
testPaths.push("0,0 10,0 10,10 0,10")
testPaths.push("5,5 95,95")
testPaths.push("90,90 100,90 100,100 90,100")
testPaths.push("0,0 0,100")

for (var p of testPaths) {
    D.addPath(p)
}

D.fillVertexGaps()

console.log(JSON.stringify(D))