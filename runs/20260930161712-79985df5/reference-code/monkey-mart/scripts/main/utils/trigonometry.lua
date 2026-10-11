local M = {}

local function distance(point1, point2)
	local x = point1.x - point2.x
	local y = point1.y - point2.y
	return math.sqrt(x * x + y * y)
end

local function distanceOp(point1, point2)
	local x = point1.x - point2.x
	local y = point1.y - point2.y
	return x * x + y * y
end

local function magnitude(vector)
	return math.sqrt(vector.x * vector.x + vector.y * vector.y)
end

local function unitVector(vector)
	return {
		x = vector.x / magnitude(vector),
		y = vector.y / magnitude(vector)
	}
end

local function dotProduct(vector1, vector2)
	return vector1.x * vector2.x + vector1.y * vector2.y
end

local function vectorBetween(startPoint, endPoint)
	return {
		x = endPoint.x - startPoint.x,
		y = endPoint.y - startPoint.y
	}
end

local function pointOnLineClosestToCircle(circle, line)
	local lineEndPoint1 = {x = line.ax, y = line.ay}
	local lineEndPoint2 = {x = line.bx, y = line.by}

	local lineUnitVector = unitVector(vectorBetween(lineEndPoint1, lineEndPoint2))

	local lineEndToCircleVector = vectorBetween(lineEndPoint1, circle.center)

	local projection = dotProduct(lineEndToCircleVector, lineUnitVector)

	local lineLen = distance(lineEndPoint1, lineEndPoint2)

	if (projection <= 0) then
		return lineEndPoint1
	elseif (projection >= lineLen) then
		return lineEndPoint2
	else
		return {
			x = lineEndPoint1.x + lineUnitVector.x * projection,
			y = lineEndPoint1.y + lineUnitVector.y * projection
		}
	end
end

local function isLineIntersectingCircle(circle, line)
	local closest = pointOnLineClosestToCircle(circle, line)
	local circleToLineDistance = distance(circle.center, closest)
	return circleToLineDistance <= circle.radius, closest
end

local function checkLineIntersection(line, lineCircle)
	local denominator, a, b, num1, num2

	denominator = ((lineCircle.by - lineCircle.ay) * (line.bx - line.ax)) - ((lineCircle.bx - lineCircle.ax) * (line.by - line.ay))
	if (denominator == 0) then
		return nil
	end

	a = line.ay - lineCircle.ay
	b = line.ax - lineCircle.ax
	num1 = ((lineCircle.bx - lineCircle.ax) * a) - ((lineCircle.by - lineCircle.ay) * b)
	num2 = ((line.bx - line.ax) * a) - ((line.by - line.ay) * b)
	a = num1 / denominator
	b = num2 / denominator

	if (a > 0 and a < 1) and (b > 0 and b < 1) then
		return {x=line.ax + (a * (line.bx - line.ax)), y=line.ay + (a * (line.by - line.ay))}
	else
		return nil
	end
end

local function interceptLines(line, lineCircle)
	local v1, v2, c, u
	v1 = {}
	v2 = {}
	v3 = {}
	v1.x = line.bx - line.ax 						
	v1.y = line.by - line.ay
	v2.x = lineCircle.bx - lineCircle.ax 			
	v2.y = lineCircle.by - lineCircle.by
	c = v1.x * v2.y - v1.y * v2.x 					
	if (c ~= 0) then
		v3.x = line.ax - lineCircle.ax
		v3.y = line.ay - lineCircle.ay
		u = (v2.x * v3.y - v2.y * v3.x) / c 		
		return {x = line.ax + v1.x * u, y = line.ay + v1.y * u}
	end
	return nil
end

local function midPoint(p1, p2)
	local midX = (p1.x + p2.x)*0.5
	local midY = (p1.y + p2.y)*0.5
	return vmath.vector3(midX,midY,0)
end

M.distance = distance
M.distanceOp = distanceOp
M.magnitude = magnitude
M.unitVector = unitVector
M.dotProduct = dotProduct
M.vectorBetween = vectorBetween
M.pointOnLineClosestToCircle = pointOnLineClosestToCircle
M.isLineIntersectingCircle = isLineIntersectingCircle
M.checkLineIntersection = checkLineIntersection
M.interceptLines = interceptLines
M.midPoint = midPoint

return M
