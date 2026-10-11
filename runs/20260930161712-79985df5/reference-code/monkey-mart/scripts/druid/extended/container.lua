












local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")
local event = require("event.event")

local abs = math.abs
local min = math.min
local max = math.max

local CORNER_PIVOTS = {
	gui.PIVOT_NE,
	gui.PIVOT_NW,
	gui.PIVOT_SE,
	gui.PIVOT_SW,
}






































local M = component.create("container")






function M:init(node, mode, callback)
	self.node = self:get_node(node)
	self.druid = self:get_druid()

	self.min_size_x = 0
	self.min_size_y = 0
	self.max_size_x = nil
	self.max_size_y = nil
	self._containers = {}
	self._draggable_corners = {}
	self.node_offset = vmath.vector4(0)
	self.node_fill_x = nil
	self.node_fill_y = nil
	self._position = gui.get_position(self.node)
	local x_koef, y_koef = helper.get_screen_aspect_koef()
	self.x_koef = x_koef
	self.y_koef = y_koef

	self.x_anchor = gui.get_xanchor(self.node)
	self.y_anchor = gui.get_yanchor(self.node)

	
	self.origin_size = gui.get_size(self.node)
	self.size = gui.get_size(self.node)
	self.position = gui.get_position(self.node)
	self.origin_position = gui.get_position(self.node)

	self._initial_adjust_mode = gui.get_adjust_mode(self.node)
	self.mode = mode or (self._initial_adjust_mode == gui.ADJUST_FIT) and const.LAYOUT_MODE.FIT or const.LAYOUT_MODE.STRETCH

	gui.set_size_mode(self.node, gui.SIZE_MODE_MANUAL)
	gui.set_adjust_mode(self.node, gui.ADJUST_FIT)

	self.on_size_changed = event.create(callback)

	self.pivot_offset = helper.get_pivot_offset(gui.get_pivot(self.node))
	self.center_offset = -vmath.vector3(self.size.x * self.pivot_offset.x, self.size.y * self.pivot_offset.y, 0)
	self:set_size(self.size.x, self.size.y)
end



function M:on_late_init()
	if not gui.get_parent(self.node) then
		
		self:fit_into_window()
	end
end



function M:on_remove()
	self:clear_draggable_corners()
	gui.set_adjust_mode(self.node, self._initial_adjust_mode)
end



function M:refresh_origins()
	self.origin_size = gui.get_size(self.node)
	self.origin_position = gui.get_position(self.node)
	self:set_pivot(gui.get_pivot(self.node))
end




function M:set_pivot(pivot)
	gui.set_pivot(self.node, pivot)
	self.pivot_offset = helper.get_pivot_offset(pivot)
	self.center_offset = -vmath.vector3(self.size.x * self.pivot_offset.x, self.size.y * self.pivot_offset.y, 0)
end




function M:on_style_change(style)
	self.style = {
		DRAGGABLE_CORNER_SIZE = style.DRAGGABLE_CORNER_SIZE or vmath.vector3(24, 24, 0),
		DRAGGABLE_CORNER_COLOR = style.DRAGGABLE_CORNER_COLOR or vmath.vector4(10)
	}
end







function M:set_size(width, height, anchor_pivot)
	width = width or self.size.x
	height = height or self.size.y

	if self.min_size_x then
		width = max(width, self.min_size_x)
	end
	if self.min_size_y then
		height = max(height, self.min_size_y)
	end
	if self.max_size_x then
		width = min(width, self.max_size_x)
	end
	if self.max_size_y then
		height = min(height, self.max_size_y)
	end
	
	if (width and width ~= self.size.x) or (height and height ~= self.size.y) then
		self.center_offset.x = -width * self.pivot_offset.x
		self.center_offset.y = -height * self.pivot_offset.y
		local dx = self.size.x - width
		local dy = self.size.y - height
		self.size.x = width
		self.size.y = height
		self.size.z = 0
		gui.set_size(self.node, self.size)

		if anchor_pivot then
			local pivot = gui.get_pivot(self.node)
			local pivot_offset = helper.get_pivot_offset(pivot)
			local new_pivot_offset = helper.get_pivot_offset(anchor_pivot)

			local position_dx = dx * (pivot_offset.x - new_pivot_offset.x)
			local position_dy = dy * (pivot_offset.y - new_pivot_offset.y)
			self:set_position(self._position.x + position_dx, self._position.y - position_dy)
		end

		self:update_child_containers()
		self.on_size_changed:trigger(self:get_context(), self.size)
	end

	return self
end




function M:get_position()
	return self._position
end





function M:set_position(pos_x, pos_y)
	if self._position.x == pos_x and self._position.y == pos_y then
		return
	end

	self._position.x = pos_x
	self._position.y = pos_y
	gui.set_position(self.node, self._position)
end




function M:get_size()
	return vmath.vector3(self.size)
end




function M:get_scale()
	return helper.get_scene_scale(self.node, true) 
end





function M:fit_into_size(target_size)
	self.fit_size = target_size
	self:refresh()

	return self
end




function M:fit_into_window()
	return self:fit_into_size(vmath.vector3(gui.get_width(), gui.get_height(), 0))
end



function M:on_window_resized()
	local x_koef, y_koef = helper.get_screen_aspect_koef()
	self.x_koef = x_koef
	self.y_koef = y_koef

	if not self._parent_container then
		self:refresh()
	end
end






function M:add_container(node_or_container, mode, on_resize_callback)
	local container = nil
	local node = node_or_container

	
	if type(node_or_container) == "table" and node_or_container.add_container then
		node = node_or_container.node
		container = node_or_container
		mode = mode or container.mode
	end

	
	
	node = self:get_node(node)

	container = container or self.druid:new(M, node, mode)
	container:set_parent_container(self)
	if on_resize_callback then
		container.on_size_changed:subscribe(on_resize_callback)
	end
	table.insert(self._containers, container)

	return container
end



function M:remove_container_by_node(node)
	for index = 1, #self._containers do
		local container = self._containers[index]
		if container.node == node then
			table.remove(self._containers, index)
			self.druid:remove(container)
			return container
		end
	end

	return nil
end



function M:set_parent_container(parent_container)
	if not parent_container then
		self._parent_container = nil
		gui.set_parent(self.node, nil)
		self:refresh()
		return
	end

	
	gui.set_parent(self.node, parent_container.node, true)

	
	local parent_left = parent_container.center_offset.x - parent_container.origin_size.x * 0.5
	local parent_right = parent_container.center_offset.x + parent_container.origin_size.x * 0.5
	local parent_top = parent_container.center_offset.y + parent_container.origin_size.y * 0.5
	local parent_bottom = parent_container.center_offset.y - parent_container.origin_size.y * 0.5

	local node_left = self.origin_position.x + self.center_offset.x - self.origin_size.x * 0.5
	local node_right = self.origin_position.x + self.center_offset.x + self.origin_size.x * 0.5
	local node_top = self.origin_position.y + self.center_offset.y + self.origin_size.y * 0.5
	local node_bottom = self.origin_position.y + self.center_offset.y - self.origin_size.y * 0.5

	self.node_offset.x = node_left - parent_left
	self.node_offset.y = node_top - parent_top
	self.node_offset.z = node_right - parent_right
	self.node_offset.w = node_bottom - parent_bottom
	self._parent_container = parent_container

	local offset_x = (self.node_offset.x + self.node_offset.z)/2
	local offset_y = (self.node_offset.y + self.node_offset.w)/2

	if self.pivot_offset.x < 0 then
		offset_x = self.node_offset.x
	end
	if self.pivot_offset.x > 0 then
		offset_x = self.node_offset.z
	end
	if self.pivot_offset.y < 0 then
		offset_y = self.node_offset.w
	end
	if self.pivot_offset.y > 0 then
		offset_y = self.node_offset.y
	end

	local koef_x = (parent_container.origin_size.x - abs(offset_x))
	self.node_fill_x = koef_x ~= 0 and self.origin_size.x / koef_x or 1
	local x_anchor = gui.get_xanchor(self.node)
	if x_anchor ~= gui.ANCHOR_NONE then
		self.node_fill_x = 1
	end

	local koef_y = (parent_container.origin_size.y - abs(offset_y))
	self.node_fill_y = koef_y ~= 0 and self.origin_size.y / koef_y or 1
	local y_anchor = gui.get_yanchor(self.node)
	if y_anchor ~= gui.ANCHOR_NONE then
		self.node_fill_y = 1
	end

	self:refresh()
end





function M:refresh()
	local x_koef, y_koef = self.x_koef, self.y_koef
	self:refresh_scale()

	if self._parent_container then
		local parent = self._parent_container
		local offset_x = (self.node_offset.x + self.node_offset.z) / 2
		local offset_y = (self.node_offset.y + self.node_offset.w) / 2

		if self.pivot_offset.x < 0 then
			offset_x = self.node_offset.x
		end
		if self.pivot_offset.x > 0 then
			offset_x = self.node_offset.z
		end
		if self.pivot_offset.y < 0 then
			offset_y = self.node_offset.w
		end
		if self.pivot_offset.y > 0 then
			offset_y = self.node_offset.y
		end

		local stretch_side_x = parent.size.x - abs(offset_x)
		local stretch_side_y = parent.size.y - abs(offset_y)

		do
			local parent_pivot_x = parent.center_offset.x + (parent.size.x * self.pivot_offset.x)
			local parent_pivot_y = parent.center_offset.y + (parent.size.y * self.pivot_offset.y)
			local pos_x = parent_pivot_x + offset_x
			local pos_y = parent_pivot_y + offset_y
			self:set_position(pos_x, pos_y)
		end

		do
			if self.x_anchor ~= gui.ANCHOR_NONE then
				stretch_side_x = parent.size.x - (abs(self.node_offset.x) + abs(self.node_offset.z))
			end

			if self.y_anchor ~= gui.ANCHOR_NONE then
				stretch_side_y = parent.size.y - (abs(self.node_offset.y) + abs(self.node_offset.w))
			end

			
			if self.mode == const.LAYOUT_MODE.STRETCH then
				self:set_size(
					abs(stretch_side_x * self.node_fill_x),
					abs(stretch_side_y * self.node_fill_y))
			end

			if self.mode == const.LAYOUT_MODE.STRETCH_X then
				self:set_size(abs(stretch_side_x * self.node_fill_x), nil)
			end

			if self.mode == const.LAYOUT_MODE.STRETCH_Y then
				self:set_size(nil, abs(stretch_side_y * self.node_fill_y))
			end
		end
	else
		if self.fit_size then
			x_koef = self.fit_size.x / self.origin_size.x * x_koef
			y_koef = self.fit_size.y / self.origin_size.y * y_koef

			if self.mode == const.LAYOUT_MODE.STRETCH then
				self:set_size(self.origin_size.x * x_koef, self.origin_size.y * y_koef)
			end
		end
	end

	self:update_child_containers()
end


function M:refresh_scale()
	if self._fit_node then
		local fit_node_size = gui.get_size(self._fit_node)

		local scale = vmath.vector3(1)
		scale.x = min(fit_node_size.x / self.size.x, 1)
		scale.y = min(fit_node_size.y / self.size.y, 1)

		scale.x = min(scale.x, scale.y)
		scale.y = min(scale.x, scale.y)

		gui.set_scale(self.node, scale)
	end
end


function M:update_child_containers()
	for index = 1, #self._containers do
		self._containers[index]:refresh()
	end
end



function M:create_draggable_corners()
	self:clear_draggable_corners()

	for _, corner_pivot in pairs(CORNER_PIVOTS) do
		local corner_offset = helper.get_pivot_offset(corner_pivot)
		local anchor_position = vmath.vector3(
			self.center_offset.x + (self.size.x) * corner_offset.x,
			self.center_offset.y + (self.size.y) * corner_offset.y,
			0)

		local new_draggable_node = gui.new_box_node(anchor_position, self.style.DRAGGABLE_CORNER_SIZE)
		gui.set_color(new_draggable_node, self.style.DRAGGABLE_CORNER_COLOR)
		gui.set_pivot(new_draggable_node, corner_pivot)
		gui.set_parent(new_draggable_node, self.node)
		self:add_container(new_draggable_node)

		
		local drag = self.druid:new_drag(new_draggable_node, function(_, x, y)
			self:_on_corner_drag(x, y, corner_offset)
		end)
		table.insert(self._draggable_corners, drag)

		drag.style.DRAG_DEADZONE = 0
	end

	return self
end



function M:clear_draggable_corners()
	for index = 1, #self._draggable_corners do
		local drag_component = self._draggable_corners[index]
		self.druid:remove(drag_component)
		self:remove_container_by_node(drag_component.node)
		gui.delete_node(drag_component.node)
	end

	self._draggable_corners = {}

	return self
end


function M:_on_corner_drag(x, y, corner_offset)
	x = corner_offset.x >= 0 and x or -x
	y = corner_offset.y >= 0 and y or -y

	local size = self:get_size()
	if self.min_size_x and size.x + x < self.min_size_x then
		x = self.min_size_x - size.x
	end
	if self.min_size_y and size.y + y < self.min_size_y then
		y = self.min_size_y - size.y
	end
	if self.max_size_x and size.x + x > self.max_size_x then
		x = self.max_size_x - size.x
	end
	if self.max_size_y and size.y + y > self.max_size_y then
		y = self.max_size_y - size.y
	end	

	if corner_offset.x < 0 then
		self.node_offset.x = self.node_offset.x - x
	end
	if corner_offset.x > 0 then
		self.node_offset.z = self.node_offset.z - x
	end
	if corner_offset.y < 0 then
		self.node_offset.w = self.node_offset.w - y
	end
	if corner_offset.y > 0 then
		self.node_offset.y = self.node_offset.y - y
	end

	local pivot = gui.get_pivot(self.node)
	local pivot_offset = helper.get_pivot_offset(pivot)

	local center_pos_x = self._position.x + (x * (pivot_offset.x + corner_offset.x))
	local center_pos_y = self._position.y + (y * (pivot_offset.y + corner_offset.y))

	self:set_position(center_pos_x, center_pos_y)
	self:set_size(size.x + x, size.y + y)
end





function M:fit_into_node(node)
	self._fit_node = self:get_node(node)
	self:refresh_scale()
	return self
end






function M:set_min_size(min_size_x, min_size_y)
	self.min_size_x = min_size_x or self.min_size_x
	self.min_size_y = min_size_y or self.min_size_y
	self:refresh()

	return self
end






function M:set_max_size(max_size_x, max_size_y)
	self.max_size_x = max_size_x or self.max_size_x
	self.max_size_y = max_size_y or self.max_size_y
	self:refresh()

	return self
end


return M
