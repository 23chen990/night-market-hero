



local color = require("druid.custom.rich_text.module.rt_color")

local M = {}
local tags = {}


function M.apply(tag, params, settings, style)
	local fn = tags[tag]
	if not fn then
		return false
	end

	fn(params, settings, style)
	return true
end


function M.register(tag, fn)
	assert(tag, "You must provide a tag")
	assert(fn, "You must provide a tag function")
	tags[tag] = fn
end







local function split(s, token)
	if not s then return nil, nil end
	local before, after = s:match("(.-)" .. token .. "(.*)")
	before = before or s
	return before, after
end





M.register("color", function(params, settings, style)
	params = style.COLORS[params] or params
	settings.color = color.parse(params)
end)


M.register("shadow", function(params, settings, style)
	params = style.COLORS[params] or params
	settings.shadow = color.parse(params)
end)


M.register("outline", function(params, settings, style)
	params = style.COLORS[params] or params
	settings.outline = color.parse(params)
end)


M.register("font", function(params, settings)
	settings.font = params
end)


M.register("size", function(params, settings)
	settings.relative_scale = tonumber(params)
end)



M.register("br", function(params, settings)
	settings.br = true
end)



M.register("nobr", function(params, settings)
	settings.nobr = true
end)






M.register("img", function(params, settings)
	local texture_and_anim, params = split(params, ",")
	local width, height
	width, params = split(params, ",")
	height = split(params, ",")
	local texture, anim = split(texture_and_anim, ":")
	width = width and tonumber(width)
	height = height and tonumber(height)

	settings.image = {
		texture = texture,
		anim = anim,
		width = width,
		height = height or width,
	}
end)


return M
