table.indexOf = function( t, object )
	if "table" == type( t ) then
		for i = 1, #t do
			if object == t[i] then
				return i
			end
		end
		return -1
	else
		error("table.indexOf expects table for first argument, " .. type(t) .. " given")
	end
end

table.indexOfLast = function( t, object )
	if "table" == type( t ) then
		local len = #t
		for i = len, 1, -1 do
			if object == t[i] then
				return i
			end
		end
		return -1
	else
		error("table.indexOfLast expects table for last argument, " .. type(t) .. " given")
	end
end

table.filter = function(t, filterIter)
	if "table" == type( t ) then
		local out = {}

		for k, v in pairs(t) do
			if filterIter(v, k, t) then table.insert(out, v) end
		end

		return out
	else
		error("table.filter expects table for first argument, " .. type(t) .. " given")
	end
end

table.concatTable = function(t, t2)
	if "table" == type( t2 ) then
		for k, v in pairs(t2) do
			table.insert(t, v)
		end
	else
		error("table.concat expects table for second argument, " .. type(t2) .. " given")
	end
end

local M = {}

local function round(value)
	return (value % 1 >= 0.5) and math.ceil(value) or math.floor(value)
end

local function roundDecimal(num, numDecimalPlaces)
	local mult = 10^(numDecimalPlaces or 0)
	return math.floor(num * mult + 0.5) / mult
end

function distanceOp(p1, p2)
  local dx = p1.x - p2.x
  local dy = p1.y - p2.y
  local s = dx * dx + dy * dy
  return s
end

local function doCirclesOverlap(circle1, circle2)
	local dx = circle1.x - circle2.x
	local dy = circle1.y - circle2.y
	local distance = math.sqrt(dx * dx + dy * dy)

	return distance < (circle1.radius + circle2.radius)
end

local function pointInPolygon(point, points)
	local inside = false
	local x = point.x
	local y = point.y
	local len = #points
	local i, j = len, len

	for i=1, len do
		if ((points[i].y < y and points[j].y>=y or points[j].y< y and points[i].y>=y) and (points[i].x<=x or points[j].x<=x)) then
			if (points[i].x+(y-points[i].y)/(points[j].y-points[i].y)*(points[j].x-points[i].x)<x) then
				inside = not inside
			end
		end
		j = i
	end

	return inside
end

local function signPoints(p1, p2, p3)
	return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
end

local function pointInTriangle(pt, v1, v2, v3)
	local d1, d2, d3
    local has_neg, has_pos

    d1 = signPoints(pt, v1, v2)
    d2 = signPoints(pt, v2, v3)
    d3 = signPoints(pt, v3, v1)

    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)

    return not (has_neg and has_pos)
end

local function pointInQuad(pt, quad)
	return pointInTriangle(pt, quad[1], quad[2], quad[3]) or
	       pointInTriangle(pt, quad[1], quad[3], quad[4])
end

local function randomPointCircle(radius, center)
	local r = radius * math.sqrt(math.random())
	local theta = math.random() * 2 * math.pi
	local x = center.x + r * math.cos(theta)
	local y = center.y + r * math.sin(theta)

	return vmath.vector3(x, y, 0)
end

local function getRandomPointOnCircle(center, radius)
    local angle = math.random() * 2 * math.pi
	
    local x = center.x + radius * math.cos(angle)
    local y = center.y + radius * math.sin(angle)
	
    return vmath.vector3(x, y, 0)
end

local function getRandomPointInSector(radius, center, angle, offsetAngle, isOnCircle)
    local r = radius * math.sqrt(math.random())

	if isOnCircle then
		r = radius
	end

    local angleInRadians = math.rad(angle)
	local offsetInRadians = math.rad(offsetAngle)
    local theta = math.random() * angleInRadians + offsetInRadians

    local x = center.x + r * math.cos(theta)
    local y = center.y + r * math.sin(theta)

    return vmath.vector3(x, y, 0)
end

local function nearPointPolygon4V(pt, points)
	local d1 = distanceOp(pt, points.a)
	local d2 = distanceOp(pt, points.b)
	local d3 = distanceOp(pt, points.c)
	local d4 = distanceOp(pt, points.d)

	local t = {d1, d2, d3, d4}

	local key, max = 1, t[1]
	for k, v in ipairs(t) do
	    if t[k] < max then
	        key, max = k, v
	    end
	end

	if key == 1 then
		return points.a, 'a'
	elseif key == 2 then
		return points.b, 'b'
	elseif key == 3 then
		return points.c, 'c'
	elseif key == 4 then
		return points.d, 'd'
	end

	return nil
end

local function updateTextWidth(node, maxWidth, vScale)
	local _txtWidth = gui.get_text_metrics_from_node(node).width

	local scale = vmath.vector3(1,1,1)

	if(_txtWidth > maxWidth) then
		local delta = utils.roundDecimal(maxWidth/_txtWidth, 2)
		scale = scale*delta
	end

	scale = scale*vScale
	gui.set_scale(node, scale)

	return scale
end


local function shuffle(tbl)
	for i = #tbl, 1, -1 do
		local j = math.random(i)
		tbl[i], tbl[j] = tbl[j], tbl[i]
	end
	return tbl
end

local function isInList(value, tbl)
	return table.indexOf(tbl, value) >= 0
end

local function map(func, array)
	local new_array = {}
	for i,v in ipairs(array) do
		new_array[i] = func(v)
	end
	return new_array
end

local function hex2rgb(hex)
    hex = hex:gsub("#","")
    return tonumber("0x"..hex:sub(1,2)), tonumber("0x"..hex:sub(3,4)), tonumber("0x"..hex:sub(5,6))
end

local function splitString(inputstr, sep)
    if sep == nil then
        sep = "%s"
    end
    local t={}
    for str in string.gmatch(inputstr, "([^"..sep.."]+)") do
            table.insert(t, str)
    end
    return t
end

local last_throttle_time = os.clock()
function throttle(diff, func)
	local time = os.clock()
	if time - last_throttle_time > diff then
		func()
		last_throttle_time = time
	end
end

local function is_equal(value_a, value_b, diff)
	diff = diff or 0.00001
	return (math.abs(value_a - value_b) <= diff) and true or false
end

local function secToHHMMSS(vSec)
	local seconds = vSec
	local hours   = math.floor(seconds / 3600)
	local minutes = math.floor((seconds - (hours * 3600)) / 60)
	local seconds = seconds - (hours * 3600) - (minutes * 60)

	if (hours   < 10) then hours   = "0" .. hours end
	if (minutes < 10) then minutes = "0" .. minutes end
	if (seconds < 10) then seconds = "0" .. seconds end
	
	local time = minutes .. ':' .. seconds
	return time
end

local function secToHMS(vSec, vIsShort, vText)
	local seconds = vSec
	local hours   = math.floor(seconds / 3600)
	local minutes = math.floor((seconds - (hours * 3600)) / 60)
	local seconds = seconds - (hours * 3600) - (minutes * 60)

	local time = hours .. vText[1] .. ' ' .. minutes .. vText[2] .. ' ' .. seconds .. vText[3]

	if vIsShort then
		time = hours .. vText[1] .. ' ' .. minutes .. vText[2] .. ' '
	end

	if (hours <= 0) then
		time = minutes .. vText[2] .. ' ' .. seconds .. vText[3]

		if (minutes <= 0) then
			time = seconds .. vText[3]
		end
	end

	return time
end

local function convertNumberFormat(number)
	local temp = number
	local tabUnits = {"K","M","B","T","aa","bb","cc","dd","ee","ff","gg","hh","ii","jj","kk","ll","mm","nn","oo","pp","qq","rr","ss","tt","uu","vv","ww","xx","yy","zz"}
	local highnumber = false
	local bignumber = 1000
	local tabposition = -1
	local p_atomepersecond = true
	local unit = nil

	if (number >= bignumber) then
		highnumber = true

		while (number >= bignumber) do
			bignumber = bignumber * 1000
			tabposition = tabposition + 1
		end

		number = number / (bignumber / 1000)
		unit = tabUnits[tabposition + 1]

	else
		unit = ""
	end

	if (unit == nil) then
		return temp
	end

	if (highnumber == true) then
		toround = 100
	elseif (p_atomepersecond == true) then
		toround = 100
	else
		toround = 10
	end

	local res = math.floor(number * toround + 0.5) / toround
	
	return res..unit
end

local function weightedRandom(prob)
	local sum = 0
	local r = math.random()

	for i, v in ipairs(prob) do
		sum = sum + v
		
		if (r <= sum) then
			return i
		end
	end

end

M.round					= round
M.roundDecimal			= roundDecimal
M.distanceOp			= distanceOp
M.doCirclesOverlap		= doCirclesOverlap
M.pointInPolygon		= pointInPolygon
M.pointInTriangle		= pointInTriangle
M.pointInQuad			= pointInQuad
M.randomPointCircle			= randomPointCircle
M.getRandomPointOnCircle	= getRandomPointOnCircle
M.getRandomPointInSector	= getRandomPointInSector
M.nearPointPolygon4V	= nearPointPolygon4V
M.updateTextWidth		= updateTextWidth
M.shuffle				= shuffle
M.isInList				= isInList
M.map					= map
M.hex2rgb				= hex2rgb
M.splitString			= splitString
M.is_equal				= is_equal
M.secToHHMMSS			= secToHHMMSS
M.secToHMS				= secToHMS
M.convertNumberFormat	= convertNumberFormat
M.weightedRandom		= weightedRandom

return M
