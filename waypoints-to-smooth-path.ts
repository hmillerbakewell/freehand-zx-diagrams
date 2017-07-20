export interface ICoords {
    x: number
    y: number
}

/**
 * Returns a smooth SVG path from start to end via all the waypoints
 * @param start {x,y} point
 * @param waypointsInBetween List of {x,y} points
 * @param end {x,y} point
 */
export function smoothWithTips(start: ICoords,
    waypointsInBetween: ICoords[],
    end: ICoords
) {
    return smooth([start].concat(waypointsInBetween).concat([end]))
}

/** Given a set of {x,y} waypoints returns the SVG necessary for
 * drawing a smooth line between them
 *  @param allWapoints List of {x,y} waypoints
 */
export function smooth(allWaypoints: ICoords[]) {
    let smoothingFactor = 0.3
    if (allWaypoints.length == 0) {
        return ""
    } else if (allWaypoints.length == 1) {
        return ""
    } else if (allWaypoints.length == 2) {
        var s = allWaypoints[0]
        var e = allWaypoints[1]
        return `M ${s.x} ${s.y} L ${e.x} ${e.y}`
    } else if (allWaypoints.length == 3) {

        var s = allWaypoints[0]
        var m = allWaypoints[1]
        var e = allWaypoints[2]
        return `M ${s.x} ${s.y} L ${m.x} ${m.y} L ${e.x} ${e.y}`
    }
    let pathCommand = ""
    let startPos = allWaypoints[0]
    let endPos = allWaypoints[allWaypoints.length - 1]
    var tangents: ICoords[] = []
    var normaliseAndPushToTangents = function (x: number, y: number) {

        var tNorm: ICoords = {
            x: 0,
            y: 0
        }
        let d = 0
        d = Math.pow(x * x + y * y, 0.5)
        if (d > 0) {
            tNorm = {
                x: x / d,
                y: y / d
            }
        }
        tangents.push(tNorm)
        return tNorm
    }
    normaliseAndPushToTangents(
        allWaypoints[1].x - startPos.x, allWaypoints[1].y - startPos.y
    )
    // waypoint i -> waypoint i+1

    for (var i = 1; i < allWaypoints.length - 1; i++) {
        normaliseAndPushToTangents(
            allWaypoints[i + 1].x - allWaypoints[i - 1].x,
            allWaypoints[i + 1].y - allWaypoints[i - 1].y
        )
    }
    // waypoint last -> vertex end
    normaliseAndPushToTangents(
        endPos.x - allWaypoints[i - 1].x,
        endPos.y - allWaypoints[i - 1].y
    )

    //Calculate path data:
    // vertex start -> waypoint 0
    pathCommand += `M ${startPos.x} ${startPos.y} `
    pathCommand += `L ${allWaypoints[1].x} ${allWaypoints[1].y} `
    // waypoint i -> waypoint i+1
    var controlPointGoingForwards = allWaypoints[1]

    for (var i = 1; i < allWaypoints.length - 1; i++) {
        let lastNode = allWaypoints[i - 1]
        let focusNode = allWaypoints[i]
        let nextNode = allWaypoints[i + 1]
        let dPre = {
            x: focusNode.x - lastNode.x,
            y: focusNode.y - lastNode.y
        }
        let dPost = {
            x: nextNode.x - focusNode.x,
            y: nextNode.y - focusNode.y
        }
        let dot: (a: ICoords, b: ICoords) => number = (a, b) => {
            return a.x * b.x + a.y * b.y
        }
        let t = tangents[i]
        let cp1 = {
            x: controlPointGoingForwards.x,
            y: controlPointGoingForwards.y
        }
        let cp2 = {
            x: focusNode.x - t.x * dot(dPre, t) * smoothingFactor,
            y: focusNode.y - t.y * dot(dPre, t) * smoothingFactor
        }
        let cp3 = {
            x: focusNode.x,
            y: focusNode.y
        }
        controlPointGoingForwards = {
            x: focusNode.x + t.x * dot(dPost, t) * smoothingFactor,
            y: focusNode.y + t.y * dot(dPost, t) * smoothingFactor
        }

        pathCommand +=
            `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${cp3.x} ${cp3.y}`
    }
    // waypoint last -> vertex end
    pathCommand += `L ${endPos.x} ${endPos.y} `
    return pathCommand
}
