/*
An implementation of Ramer-Douglas-Peucker as described in:
https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
*/

/**
 * The shortest distance from the point to the line
 * @param pOffset The offset point (not on the line)
 * @param pStart The point at the start of the line
 * @param pEnd The point at the end of the lin
 */
export function perpendicularDistance(pOffset: number[], pStart: number[], pEnd: number[]) {
    var aX = pEnd[0] - pStart[0]
    var aY = pEnd[1] - pStart[1]
    var bX = pOffset[0] - pStart[0]
    var bY = pOffset[1] - pStart[1]
    if (aX === 0 && aY === 0) {
        return Math.pow(bX * bX + bY * bY, 0.5)
    }
    var aCrossB = aX * bY - aY * bX
    return Math.abs(aCrossB / Math.pow(aX * aX + aY * aY, 0.5))
}

/**
 * Returns all but the last waypoint as described by Ramer-Douglas-Peucker
 * @param pointList Point list as an array of pairs of points
 * @param epsilon The minimum distance away from the straight line before
 *                  a point counts as a waypoint
 */
export function RamerDouglasPeucker(pointList: number[][], epsilon: number) {
    var dmax: number = 0
    var index: number = 0
    var end = pointList.length - 1
    var resultList: number[][]
    for (var i = 1; i < end - 1; i++) {
        var d = perpendicularDistance(pointList[i], pointList[0], pointList[end])
        if (d > dmax) {
            index = i
            dmax = d
        }
    }
    if (dmax > epsilon) {
        var rec1 = RamerDouglasPeucker(pointList.slice(0, index + 1), epsilon)
        var rec2 = RamerDouglasPeucker(pointList.slice(index, end), epsilon)
        resultList = rec1.concat(rec2)
    } else {
        resultList = [pointList[0]]
    }
    return resultList
}