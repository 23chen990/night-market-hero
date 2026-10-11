local const = require("druid.const")


local gui_get_node = gui.get_node
local gui_get = gui.get
local gui_pick_node = gui.pick_node




local M = {}

local POSITION_X = hash("position.x")
local SCALE_X = hash("scale.x")
local SIZE_X = hash("size.x")

local function get_text_width(text_node)
	if text_node then
		local text_metrics = M.get_text_metrics_from_node(text_node)
		local text_scale = gui_get(text_node, SCALE_X)
		return text_metrics.width * text_scale
	end

	return 0
end


local function get_icon_width(icon_node)
	if icon_node then
		return gui_get(icon_node, SIZE_X) * gui_get(icon_node, SCALE_X) 
	end

	return 0
end


local function is_text_node(node)
	return gui.get_text(node) ~= nil
end



local function get_width(node)
	return is_text_node(node) and get_text_width(node) or get_icon_width(node)
end










function M.centrate_text_with_icon(text_node, icon_node, margin)
	return M.centrate_nodes(margin, text_node, icon_node)
end










function M.centrate_icon_with_text(icon_node, text_node, margin)
	return M.centrate_nodes(margin, icon_node, text_node)
end









function M.centrate_nodes(margin, ...)
	margin = margin or 0

	local width = 0
	local count = select("#", ...)
	local node_widths = {}

	
	for i = 1, count do
		local node = select(i, ...)
		node_widths[i] = get_width(node)
		width = width + node_widths[i]
	end
	width = width + margin * (count - 1)

	
	local pos_x = 0
	for i = 1, count do
		local node = select(i, ...)
		local node_width = node_widths[i]

		pos_x = pos_x + node_width/2 

		local pivot_offset = M.get_pivot_offset(gui.get_pivot(node))
		local new_pos_x = pos_x - width/2 + pivot_offset.x * node_width 
		gui.set(node, POSITION_X, new_pos_x)

		pos_x = pos_x + node_widths[i]/2 + margin 
	end

	return width
end







function M.get_node(node_id, template, nodes)
	if type(node_id) ~= "string" then
		
		return node_id
	end

	
	if template and #template > 0 then
		node_id = template .. "/" .. node_id
	end

	
	if nodes then
		return nodes[node_id]
	end

	return gui_get_node(node_id)
end





function M.get_screen_aspect_koef()
	local window_x, window_y = window.get_size()

	local stretch_x = window_x / gui.get_width()
	local stretch_y = window_y / gui.get_height()
	local stretch_koef = math.min(stretch_x, stretch_y)

	local koef_x = window_x / (stretch_koef * sys.get_config_int("display.width"))
	local koef_y = window_y / (stretch_koef * sys.get_config_int("display.height"))

	return koef_x, koef_y
end




function M.get_gui_scale()
	local window_x, window_y = window.get_size()
	return math.min(window_x / gui.get_width(), window_y / gui.get_height())
end







function M.step(current, target, step)
	if current < target then
		return math.min(current + step, target)
	else
		return math.max(target, current - step)
	end
end







function M.clamp(value, v1, v2)
	if v1 and v2 then
		if v1 > v2 then
			v1, v2 = v2, v1
		end
	end

	if v1 and value < v1 then
		return v1
	end

	if v2 and value > v2 then
		return v2
	end

	return value
end








function M.distance(x1, y1, x2, y2)
	return math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2)
end





function M.sign(val)
	if val == 0 then
		return 0
	end

	return (val < 0) and -1 or 1
end






function M.round(num, num_decimal_places)
	local mult = 10^(num_decimal_places or 0)
	return math.floor(num * mult + 0.5) / mult
end







function M.lerp(a, b, t)
	return a + (b - a) * t
end






function M.contains(array, value)
	for index = 1, #array do
		if array[index] == value then
			return index
		end
	end
	return nil
end





function M.deepcopy(orig_table)
	local orig_type = type(orig_table)
	local copy
	if orig_type == 'table' then
		copy = {}
		for orig_key, orig_value in next, orig_table, nil do
			copy[M.deepcopy(orig_key)] = M.deepcopy(orig_value)
		end
	else 
		copy = orig_table
	end
	return copy
end






function M.add_array(target, source)
	assert(target)

	if not source then
		return target
	end

	for index = 1, #source do
		table.insert(target, source[index])
	end

	return target
end








function M.pick_node(node, x, y, node_click_area)
	local is_pick = gui_pick_node(node, x, y)

	if node_click_area then
		is_pick = is_pick and gui_pick_node(node_click_area, x, y)
	end

	return is_pick
end





function M.get_scaled_size(node)
	return vmath.mul_per_elem(gui.get_size(node), gui.get_scale(node)) 
end






function M.get_scene_scale(node, include_passed_node_scale)
	local scale = include_passed_node_scale and gui.get_scale(node) or vmath.vector3(1)
	local parent = gui.get_parent(node)
	while parent do
		scale = vmath.mul_per_elem(scale, gui.get_scale(parent))
		parent = gui.get_parent(parent)
	end

	return scale
end





function M.get_closest_stencil_node(node)
	if not node then
		return nil
	end

	local parent = gui.get_parent(node)
	while parent do
		local clipping_mode = gui.get_clipping_mode(parent)
		local is_clipping_normal = not gui.get_clipping_inverted(parent)

		if is_clipping_normal and clipping_mode == gui.CLIPPING_MODE_STENCIL then
			return parent
		end

		parent = gui.get_parent(parent)
	end

	return nil
end






function M.get_pivot_offset(pivot_or_node)
	if type(pivot_or_node) == "number" then
		return const.PIVOTS[pivot_or_node]
	end
	return const.PIVOTS[gui.get_pivot(pivot_or_node)]
end




function M.is_desktop()
	return const.CURRENT_SYSTEM_NAME == const.OS.WINDOWS or const.CURRENT_SYSTEM_NAME == const.OS.MAC or const.CURRENT_SYSTEM_NAME == const.OS.LINUX
end





function M.is_mobile()
	local sys_name = const.CURRENT_SYSTEM_NAME
	return sys_name == const.OS.IOS or sys_name == const.OS.ANDROID
end




function M.is_web()
	return const.CURRENT_SYSTEM_NAME == const.OS.BROWSER
end




function M.is_web_mobile()
	if html5 then
		return html5.run("(typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('IEMobile') !== -1);") == "true"
	end
	return false
end




function M.is_multitouch_supported()
	return M.is_mobile() or M.is_web_mobile()
end





function M.table_to_string(t)
	if not t then
		return ""
	end

	local result = "{"

	for key, value in pairs(t) do
		if #result > 1 then
			result = result .. ","
		end
		result = result .. key .. ": " .. value
	end

	return result .. "}"
end






function M.get_border(node, offset)
	local pivot = gui.get_pivot(node)
	local pivot_offset = M.get_pivot_offset(pivot)
	local size = M.get_scaled_size(node)
	local border = vmath.vector4(
		-size.x * (0.5 + pivot_offset.x),
		size.y * (0.5 - pivot_offset.y),
		size.x * (0.5 - pivot_offset.x),
		-size.y * (0.5 + pivot_offset.y)
	)

	if offset then
		border.x = border.x + offset.x
		border.y = border.y + offset.y
		border.z = border.z + offset.x
		border.w = border.w + offset.y
	end

	return border
end


local TEXT_METRICS_OPTIONS = {
	line_break = false,
	tracking = 0,
	leading = 0,
	width = 0,
}




function M.get_text_metrics_from_node(text_node)
	local options = TEXT_METRICS_OPTIONS
	options.tracking = gui.get_tracking(text_node)
	options.line_break = gui.get_line_break(text_node)

	options.width = 0
	options.leading = 0

	
	if options.line_break then
		options.width = gui.get_size(text_node).x
		options.leading = gui.get_leading(text_node)
	end

	local font_resource = gui.get_font_resource(gui.get_font(text_node))
	return resource.get_text_metrics(font_resource, gui.get_text(text_node), options)
end









function M.insert_with_shift(array, item, index, shift_policy)
	shift_policy = shift_policy or const.SHIFT.RIGHT

	local len = #array
	index = index or len + 1

	if array[index] and shift_policy ~= const.SHIFT.NO_SHIFT then
		local check_index = index
		local next_element = array[check_index]
		while next_element or (check_index >= 1 and check_index <= len) do
			check_index = check_index + shift_policy
			local check_element = array[check_index]
			array[check_index] = next_element
			next_element = check_element
		end
	end

	array[index] = item

	return item
end








function M.remove_with_shift(array, index, shift_policy)
	shift_policy = shift_policy or const.SHIFT.RIGHT

	local len = #array
	index = index or len

	local item = array[index]
	array[index] = nil

	if shift_policy ~= const.SHIFT.NO_SHIFT then
		local check_index = index + shift_policy
		local next_element = array[check_index]
		while next_element or (check_index >= 0 and check_index <= len + 1) do
			array[check_index - shift_policy] = next_element
			array[check_index] = nil
			check_index = check_index + shift_policy
			next_element = array[check_index]
		end
	end

	return item
end





function M.get_full_position(node, root)
	local position = gui.get_position(node)
	local parent = gui.get_parent(node)
	while parent and parent ~= root do
		local parent_position = gui.get_position(parent)
		position.x = position.x + parent_position.x
		position.y = position.y + parent_position.y
		parent = gui.get_parent(parent)
	end

	return position
end

















function M.get_animation_data_from_node(node, atlas_path)
	local atlas_data = resource.get_atlas(atlas_path)
	local tex_info = resource.get_texture_info(atlas_data.texture)
	local tex_w = tex_info.width
	local tex_h = tex_info.height

	local animation_data

	local sprite_image_id = gui.get_flipbook(node)
	for _, animation in ipairs(atlas_data.animations) do
		if hash(animation.id) == sprite_image_id then
			animation_data = animation
			break
		end
	end
	assert(animation_data, "Unable to find image " .. sprite_image_id)

	local frames = {}
	for index = animation_data.frame_start, animation_data.frame_end - 1 do
		local uvs = atlas_data.geometries[index].uvs
		assert(#uvs == 8, "Sprite trim mode should be disabled for the images.")

		
		
		
		
		
		
		

		
		
		
		
		
		
		
		
		
		
		
		
		
		

		local width = uvs[5] - uvs[1] 
		local height = uvs[2] - uvs[4] 
		local is_rotated = height < 0 

		local x_left = uvs[1]
		local y_bottom = uvs[2]
		local x_right = uvs[5]
		local y_top = uvs[6]

		
		local uv_coord = vmath.vector4(
			x_left / tex_w,
			(tex_h - y_bottom) / tex_h,
			x_right / tex_w,
			(tex_h - y_top) / tex_h
		)

		if is_rotated then
			
			
			
			
			
			
			
			height = -height

			uv_coord.x, uv_coord.y, uv_coord.z, uv_coord.w = uv_coord.y, uv_coord.z, uv_coord.w, uv_coord.x

			
			
			
			
			
			
			
		end

		local frame = {
			uv_coord = uv_coord,
			w = width,
			h = height,
			uv_rotated = is_rotated and vmath.vector4(0, 1, 0, 0) or vmath.vector4(1, 0, 0, 0)
		}

		table.insert(frames, frame)
	end

	return {
		frames 	= frames,
		width   = animation_data.width,
		height 	= animation_data.height,
		fps     = animation_data.fps,
		v       = vmath.vector4(1, 1, animation_data.width, animation_data.height),
		current_frame = 1,
		node    = node,
	}
end


return M
