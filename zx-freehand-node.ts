import RDP = require("./RamerDouglasPeucker.js")
import ZX = require("./zx-theory.js")
import convexHull = require("convexhull-js")
import ZXIO = require("./zx-io.js")

type ICoord = ZXIO.ICoord

/**
 * Given a collection of paths make a best guess as what the
 * user was trying to draw in terms of node data.
 * Returns a wire node if it thought the path was a wire.
 * @param waypointLists List of lists of {x,y} coordinates.
 */
export function recogniseNodeDataSimple(
    waypointLists: ZXIO.ICoord[][]
) {

    var acceptableBBoxSize = 30
    var shortGapSize = 10

    var allPoints = waypointLists.reduce(function (a, b) {
        return a.concat(b)
    })
    var data: ZXIO.IVertexData = {
        type: ZX.VERTEXTYPES.X,
        label: "",
        radius: 0
    }

    var distanceAB = function (a: ICoord, b: ICoord) {
        var dx = a.x - b.x
        var dy = a.y - b.y
        return Math.pow(dx * dx + dy * dy, 0.5)
    }

    var toPos = function (a: number[]) {
        return {
            x: a[0], y: a[1]
        }
    }

    var start = allPoints[0]
    var end = allPoints[allPoints.length - 1]

    // If it is a long way from start to end, then it is a wire:
    if (distanceAB(start, end) > (acceptableBBoxSize * Math.sqrt(2))) {
        data.type = ZX.VERTEXTYPES.WIRE
        return data
    }



    var hull = <ICoord[]>convexHull(allPoints)
    var h0 = hull[0]
    var h1 = hull[1]
    var he = hull[hull.length - 1]
    var fixedInteriorPoint = {
        x: 0.4 * h0.x + 0.3 * h1.x + 0.3 * he.x,
        y: 0.4 * h0.y + 0.3 * h1.y + 0.3 * he.y
    }

    var roundTheOutside = hull.sort(function (a, b) {
        var dax = fixedInteriorPoint.x - a.x
        var dbx = fixedInteriorPoint.x - b.x

        var thetaA = angleAFromB(a, fixedInteriorPoint)
        var thetaB = angleAFromB(b, fixedInteriorPoint)

        return thetaA - thetaB
    })
    var outsideArray = roundTheOutside.map(function (a) { return [a.x, a.y] })
    var circumference = 0
    var bboxLeft = outsideArray[0][0]
    var bboxRight = outsideArray[0][0]
    var bboxTop = outsideArray[0][1]
    var bboxBottom = outsideArray[0][1]
    var numPoints = outsideArray.length
    var angles: number[] = []
    for (var i = 0; i < outsideArray.length; i++) {
        var previousNode = outsideArray[(i - 1 + numPoints) % numPoints]
        var focusNode = outsideArray[i]
        var nextNode = outsideArray[(i + 1) % numPoints]
        bboxTop = Math.min(bboxTop, focusNode[1])
        bboxBottom = Math.max(bboxBottom, focusNode[1])
        bboxLeft = Math.min(bboxLeft, focusNode[0])
        bboxRight = Math.max(bboxRight, focusNode[0])
        circumference += distanceAB(
            { x: focusNode[0], y: focusNode[1] },
            { x: nextNode[0], y: nextNode[1] })
        var a = [previousNode[0] - focusNode[0], previousNode[1] - focusNode[1]]
        var b = [nextNode[0] - focusNode[0], nextNode[1] - focusNode[1]]
        var la = Math.pow(a[0] * a[0] + a[1] * a[1], 0.5)
        var lb = Math.pow(b[0] * b[0] + b[1] * b[1], 0.5)
        angles.push(Math.acos((a[0] * b[0] + a[1] * b[1]) / (la * lb)))
    }

    var bboxHeight = bboxBottom - bboxTop
    var bboxWidth = bboxRight - bboxLeft
    // If the bounding box is huge
    // hen it's a wire.
    if (bboxHeight > acceptableBBoxSize || bboxWidth > acceptableBBoxSize) {
        data.type = ZX.VERTEXTYPES.WIRE
        return data
    }

    // if bbox is not huge and
    // if it is a short distance from start to end
    // then it is a node
    if (distanceAB(start, end) < shortGapSize) {
        data.type = ZX.VERTEXTYPES.Z
        data.radius = Math.min(bboxWidth, bboxHeight) / 2
        return data
    }


    // Now examine the angles:
    var anglesDistQuarter = angles.map(function (a) {
        return Math.abs(((a + Math.PI / 2) % (Math.PI / 2)) - (Math.PI / 2))
    })
    var angleSum = anglesDistQuarter.reduce(function (a, b) { return a + b })
    var angleAvg = angleSum / anglesDistQuarter.length

    var startPos = { x: outsideArray[0][0], y: outsideArray[0][1] }
    function areaOfTriangle(a: ICoord, b: ICoord, c: ICoord) {
        return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
    }

    var hullArea = 0;
    for (var i = 1; i < outsideArray.length - 1; i++) {
        hullArea += areaOfTriangle(startPos,
            {
                x: outsideArray[i][0],
                y: outsideArray[i][1]
            },
            {
                x: outsideArray[i + 1][0],
                y: outsideArray[i + 1][1]
            })
    }


    var bboxCenter = {
        x: bboxLeft + 0.5 * (bboxRight - bboxLeft),
        y: bboxTop + 0.5 * (bboxBottom - bboxTop)
    }

    var distancesFromMid = outsideArray.map(function (a) {
        return distanceAB({ x: a[0], y: a[1] }, bboxCenter)
    })
    var minDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return Math.min(a, b)
    })


    var bboxPerimeter = 2 * bboxWidth + 2 * bboxHeight
    var diameter = Math.min(bboxWidth, bboxHeight)
    var diagonal = Math.pow(Math.pow(bboxWidth, 2) + Math.pow(bboxHeight, 2), 0.5)
    var circOfPerfectCircle = Math.PI * minDistanceFromMid
    var areaOfPerfectCirle = Math.PI * Math.pow(diameter / 2, 2)
    var areaOfPerfectRect = bboxWidth * bboxHeight
    var perimOfNearLine = 2 * diagonal

    var maxDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return Math.max(a, b)
    })

    var minDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return Math.min(a, b)
    })
    var distancesFromCirc = distancesFromMid.map(function (a) {
        return a - diameter / 2
    })
    var avgDistanceFromCirc = distancesFromCirc.reduce(function (a, b) {
        return a + b;
    }) / distancesFromCirc.length

    var pointedness = maxDistanceFromMid / minDistanceFromMid

    data.radius = diagonal / 2

    // biasses:
    var rectOverCirc = 0.5
    var circOverLine = 0.5

    var curveNeeded = 0.1

    var rectangularEccentricity =
        Math.min(bboxWidth, bboxHeight) / Math.max(bboxWidth, bboxHeight)

    // Is it square?
    if (rectangularEccentricity > 0.66) {
        // Bounding box is squarish:
        // Does it go out to the corner?
        if (pointedness > (curveNeeded + (1 - curveNeeded) * Math.sqrt(2))) {
            // Does it cover a large area?
            if (hullArea > areaOfPerfectCirle) {
                data.type = ZX.VERTEXTYPES.Z
            } else {
                data.type = ZX.VERTEXTYPES.WIRE
            }
        } else {
            // Doesn't go out to the corner
            // Does it cover a large area?
            if (hullArea > areaOfPerfectCirle * 0.75) {
                data.type = ZX.VERTEXTYPES.Z
            } else {
                data.type = ZX.VERTEXTYPES.WIRE
            }
        }
    } else {
        // Probably not a square
        data.type = ZX.VERTEXTYPES.WIRE
    }
    return data
}

/** Defunct function, kept for cannibalisation */
export function recogniseNodeDataComplex(
    waypointLists: ZXIO.ICoord[][]
) {
    var allPoints = waypointLists.reduce(function (a, b) {
        return a.concat(b)
    })
    var data: ZXIO.IVertexData = {
        type: ZX.VERTEXTYPES.X,
        label: "",
        radius: 0
    }
    var hull = <ICoord[]>convexHull(allPoints)
    var h0 = hull[0]
    var h1 = hull[1]
    var he = hull[hull.length - 1]
    var someMid = {
        x: 0.4 * h0.x + 0.3 * h1.x + 0.3 * he.x,
        y: 0.4 * h0.y + 0.3 * h1.y + 0.3 * he.y
    }

    var angleFromMidpoint = function (a: ICoord) {
        var modifier = 0
        if (a.y < someMid.y) {
            modifier = Math.PI
        }
        return Math.atan((someMid.x - a.x) / (someMid.y - a.y)) + modifier
    }
    var roundTheOutside = hull.sort(function (a, b) {
        var dax = someMid.x - a.x
        var dbx = someMid.x - b.x

        var thetaA = angleFromMidpoint(a)
        var thetaB = angleFromMidpoint(b)

        return thetaA - thetaB
    })
    var outsideArray = roundTheOutside.map(function (a) { return [a.x, a.y] })
    var distanceAB = function (a: ICoord, b: ICoord) {
        var dx = a.x - b.x
        var dy = a.y - b.y
        return Math.pow(dx * dx + dy * dy, 0.5)
    }
    var circumference = 0
    var bboxLeft = outsideArray[0][0]
    var bboxRight = outsideArray[0][0]
    var bboxTop = outsideArray[0][1]
    var bboxBottom = outsideArray[0][1]
    var numPoints = outsideArray.length
    var angles: number[] = []
    for (var i = 0; i < outsideArray.length; i++) {
        var previousNode = outsideArray[(i - 1 + numPoints) % numPoints]
        var focusNode = outsideArray[i]
        var nextNode = outsideArray[(i + 1) % numPoints]
        bboxTop = Math.min(bboxTop, focusNode[1])
        bboxBottom = Math.max(bboxBottom, focusNode[1])
        bboxLeft = Math.min(bboxLeft, focusNode[0])
        bboxRight = Math.max(bboxRight, focusNode[0])
        circumference += distanceAB(
            { x: focusNode[0], y: focusNode[1] },
            { x: nextNode[0], y: nextNode[1] })
        var a = [previousNode[0] - focusNode[0], previousNode[1] - focusNode[1]]
        var b = [nextNode[0] - focusNode[0], nextNode[1] - focusNode[1]]
        var la = Math.pow(a[0] * a[0] + a[1] * a[1], 0.5)
        var lb = Math.pow(b[0] * b[0] + b[1] * b[1], 0.5)
        angles.push(Math.acos((a[0] * b[0] + a[1] * b[1]) / (la * lb)))
    }

    // Now examine the angles:
    var anglesDistQuarter = angles.map(function (a) {
        return Math.abs(((a + Math.PI / 2) % (Math.PI / 2)) - (Math.PI / 2))
    })
    var angleSum = anglesDistQuarter.reduce(function (a, b) { return a + b })
    var angleAvg = angleSum / anglesDistQuarter.length

    var startPos = { x: outsideArray[0][0], y: outsideArray[0][1] }
    function areaOfTriangle(a: ICoord, b: ICoord, c: ICoord) {
        return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
    }

    var hullArea = 0;
    for (var i = 1; i < outsideArray.length - 1; i++) {
        hullArea += areaOfTriangle(startPos,
            {
                x: outsideArray[i][0],
                y: outsideArray[i][1]
            },
            {
                x: outsideArray[i + 1][0],
                y: outsideArray[i + 1][1]
            })
    }

    var bboxHeight = bboxBottom - bboxTop
    var bboxWidth = bboxRight - bboxLeft

    var bboxCenter = {
        x: bboxLeft + 0.5 * (bboxRight - bboxLeft),
        y: bboxTop + 0.5 * (bboxBottom - bboxTop)
    }

    var distancesFromMid = outsideArray.map(function (a) {
        return distanceAB({ x: a[0], y: a[1] }, bboxCenter)
    })
    var meanDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return a + b
    }) / distancesFromMid.length
    var distancesFromMidVariance = distancesFromMid.reduce(function (a, b) {
        return a + Math.pow(b - meanDistanceFromMid, 2)
    }) / distancesFromMid.length


    var bboxPerimeter = 2 * bboxWidth + 2 * bboxHeight
    var diameter = Math.min(bboxWidth, bboxHeight)
    var diagonal = Math.pow(Math.pow(bboxWidth, 2) + Math.pow(bboxHeight, 2), 0.5)
    var circOfPerfectCircle = Math.PI * diameter
    var areaOfPerfectCirle = Math.PI * Math.pow(diameter / 2, 2)
    var areaOfPerfectRect = bboxWidth * bboxHeight
    var circOfNearLine = 2 * diagonal

    var maxDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return Math.max(a, b)
    })

    var minDistanceFromMid = distancesFromMid.reduce(function (a, b) {
        return Math.min(a, b)
    })
    var distancesFromCirc = distancesFromMid.map(function (a) {
        return a - diameter / 2
    })
    var avgDistanceFromCirc = distancesFromCirc.reduce(function (a, b) {
        return a + b;
    }) / distancesFromCirc.length

    var pointedness = maxDistanceFromMid / minDistanceFromMid

    data.radius = diagonal / 2

    // biasses:
    var rectOverCirc = 0.5
    var circOverLine = 0.5

    var curveNeeded = 0.1

    // Is it square?
    if (Math.min(bboxWidth, bboxHeight) / Math.max(bboxWidth, bboxHeight) > 0.5) {
        // Bounding box is a square:
        // Does it go out to the corner?
        if (pointedness > (curveNeeded + (1 - curveNeeded) * Math.sqrt(2))) {
            // Does it cover a large area?
            if (hullArea > areaOfPerfectCirle) {
                data.type = ZX.VERTEXTYPES.HADAMARD
            } else {
                data.type = ZX.VERTEXTYPES.WIRE
            }
        } else {
            // Doesn't go out to the corner
            // Does it cover a large area?
            if (hullArea > areaOfPerfectCirle * 0.75) {
                data.type = ZX.VERTEXTYPES.Z
            } else {
                data.type = ZX.VERTEXTYPES.WIRE
            }
        }
    } else {
        // Probably not a square
        data.type = ZX.VERTEXTYPES.WIRE
    }
    return data
}


var angleAFromB = function (a: ICoord, midPoint: ICoord) {
    var modifier = 0
    if (a.y < midPoint.y) {
        modifier = Math.PI
    }
    return Math.atan((midPoint.x - a.x) / (midPoint.y - a.y)) + modifier
}
