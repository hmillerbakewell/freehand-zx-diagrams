
export = pathInterpolate;

var interpolate = function (lambda, a, b) {
  return ((1 - lambda) * a + lambda * b)
}

var pathInterpolate = function (inputPathString, interpolationDistance) {
  /*
  Overview: Interpolate a path, giving it consistent speed
  Input: Series of pairs of alternating x-, y-coordinates (typically freehand-drawn)
    example: "12.301 -0.1112 31 24.1273678"
  Output: An object with the following properties:
    start: [x, y]                   Start coordinates
    end: [x, y]                     End coordinates
    length: Number                  Length of original path
    bbox: [x, y, width, height]    Bounding box of original path
    waypoints: [[x1, y1], [x2, y2], ... ]
  The path described by waypoints is an interpolation of the input path
  The interpolation distance is _guided_ by ${interpolationDistance}
  However the given interpolationDistance will almost never divide the actual length of the path evenly
  And so the distances will be stretched slightly to ensure even spacing of waypoints
  */

  // Insist that the interpolation distance is non-zero positive
  interpolationDistance = Math.max(0, interpolationDistance) || 1
  try {
    var _splitNumbers = inputPathString.split(/[ ,]/g)
  } catch (e) {
    throw new Error('First argument for pathInterpolate not a string')
  }
  var start = [parseFloat(_splitNumbers[0]), parseFloat(_splitNumbers[1])]
  var end = [parseFloat(_splitNumbers[_splitNumbers.length - 2]), parseFloat(_splitNumbers[_splitNumbers.length - 1])]

  // Find the bounding box
  // Start by setting everything to the start coordinates
  var bbLeft = start[0]
  var bbTop = start[1]
  var bbRight = bbLeft
  var bbBottom = bbTop
  var x, y
  // Find the length of the path
  var distance = 0
  var delta = 0
  var deltaList = []
  var lastX = start[0]
  var lastY = start[1]

  for (var i = 0; i < _splitNumbers.length; i += 2) {
    x = parseFloat(_splitNumbers[i])
    y = parseFloat(_splitNumbers[i + 1])
    // Bounding Box
    bbLeft = Math.min(bbLeft, x)
    bbRight = Math.max(bbRight, x)
    bbTop = Math.min(bbTop, y)
    bbBottom = Math.max(bbBottom, y)
    // Distance
    delta = Math.pow(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2), 0.5)
    deltaList.push(delta) // Store for next loop
    distance += delta
    // Update buffer
    lastX = x
    lastY = y
  }

  // Calculate the stretched interpolation distance
  var stretchedInterDist = distance / Math.floor(distance / interpolationDistance)
  // Find the coordinate every ${stretchedInterDist} distance along
  var distanceSinceLastWaypoint = 0
  var waypoints = []
  var wx, wy
  waypoints.push(start)
  for (i = 0; i < _splitNumbers.length; i += 2) {
    x = parseFloat(_splitNumbers[i])
    y = parseFloat(_splitNumbers[i + 1])
    // Distance
    delta = deltaList[i / 2]
    distanceSinceLastWaypoint += delta
    while (distanceSinceLastWaypoint > stretchedInterDist) {
      distanceSinceLastWaypoint -= stretchedInterDist
      wx = interpolate(distanceSinceLastWaypoint / delta, x, lastX)
      wy = interpolate(distanceSinceLastWaypoint / delta, y, lastY)
      waypoints.push([wx, wy])
    }
    // Update buffer
    lastX = x
    lastY = y
  }
  if (distanceSinceLastWaypoint < (stretchedInterDist / 2)) {
    // Remove the last waypoint if it is too close to the end
    // This happens due to rounding errors (should be extrememly close to the end)
    waypoints.pop()
  }
  // Add in the end waypoint
  waypoints.push(end)

  return {
    start: start,
    end: end,
    length: distance,
    bbox: [bbLeft, bbTop, bbRight - bbLeft, bbBottom - bbTop],
    waypoints: waypoints
  }
}