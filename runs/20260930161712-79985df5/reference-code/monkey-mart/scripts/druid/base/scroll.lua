local event = require("event.event")
local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")


























































local M = component.create("scroll")





function M:init(view_node, content_node)
	self.druid = self:get_druid()

	self.view_node = self:get_node(view_node)
	self.view_border = helper.get_border(self.view_node)
	self.content_node = self:get_node(content_node)

	self.view_size = helper.get_scaled_size(self.view_node)

	self.position = gui.get_position(self.content_node)
	self.target_position = vmath.vector3(self.position)
	self.inertion = vmath.vector3(0)

	self.drag = self.druid:new_drag(view_node, self._on_scroll_drag)
	self.drag.on_touch_start:subscribe(self._on_touch_start)
	self.drag.on_touch_end:subscribe(self._on_touch_end)

	self.hover = self.druid:new_hover(view_node)
	self.hover.on_mouse_hover:subscribe(self._on_mouse_hover)
	self._is_mouse_hover = false

	self.on_scroll = event.create()
	self.on_scroll_to = event.create()
	self.on_point_scroll = event.create()

	self.selected = nil
	self.is_animate = false

	self._offset = vmath.vector3(0)
	self._is_horizontal_scroll = true
	self._is_vertical_scroll = true
	self._grid_on_change = nil
	self._grid_on_change_callback = nil

	self:_update_size()
end




function M:on_style_change(style)
	self.style = {}
	self.style.EXTRA_STRETCH_SIZE = style.EXTRA_STRETCH_SIZE or 0
	self.style.ANIM_SPEED = style.ANIM_SPEED or 0.2
	self.style.BACK_SPEED = style.BACK_SPEED or 0.35

	self.style.FRICT = style.FRICT or 0
	self.style.FRICT_HOLD = style.FRICT_HOLD or 0

	self.style.INERT_THRESHOLD = style.INERT_THRESHOLD or 3
	self.style.INERT_SPEED = style.INERT_SPEED or 30
	self.style.POINTS_DEADZONE = style.POINTS_DEADZONE or 20
	self.style.SMALL_CONTENT_SCROLL = style.SMALL_CONTENT_SCROLL or false
	self.style.WHEEL_SCROLL_SPEED = style.WHEEL_SCROLL_SPEED or 0
	self.style.WHEEL_SCROLL_INVERTED = style.WHEEL_SCROLL_INVERTED or false
	self.style.WHEEL_SCROLL_BY_INERTION = style.WHEEL_SCROLL_BY_INERTION or false

	self._is_inert = not (self.style.FRICT == 0 or
		self.style.FRICT_HOLD == 0 or
		self.style.INERT_SPEED == 0)
end



function M:on_late_init()
	if not self.click_zone then
		local stencil_node = helper.get_closest_stencil_node(self.node)
		if stencil_node then
			self:set_click_zone(stencil_node)
		end
	end
end



function M:on_layout_change()
	gui.set_position(self.content_node, self.position)
end



function M:update(dt)
	if self.is_animate then
		self.position.x = gui.get(self.content_node, "position.x") 
		self.position.y = gui.get(self.content_node, "position.y") 
		self.on_scroll:trigger(self:get_context(), self.position)
	end

	if self.drag.is_drag then
		self:_update_hand_scroll(dt)
	else
		self:_update_free_scroll(dt)
	end
end



function M:on_input(action_id, action)
	return self:_process_scroll_wheel(action_id, action)
end



function M:on_remove()
	self:bind_grid(nil)
end





function M:scroll_to(point, is_instant)
	local b = self.available_pos
	local target = vmath.vector3(
		self._is_horizontal_scroll and -point.x or self.target_position.x,
		self._is_vertical_scroll and -point.y or self.target_position.y,
		0)
	target.x = helper.clamp(target.x, b.x, b.z)
	target.y = helper.clamp(target.y, b.y, b.w)

	self:_cancel_animate()

	self.is_animate = not is_instant

	if is_instant then
		self.target_position = target
		self:_set_scroll_position(target.x, target.y)
	else
		gui.animate(self.content_node, gui.PROP_POSITION, target, gui.EASING_OUTSINE, self.style.ANIM_SPEED, 0, function()
			self.is_animate = false
			self.target_position = target
			self:_set_scroll_position(target.x, target.y)
		end)
	end

	self.on_scroll_to:trigger(self:get_context(), target, is_instant)
end





function M:scroll_to_index(index, skip_cb)
	if not self.points then
		return
	end

	index = helper.clamp(index, 1, #self.points)

	if self.selected ~= index then
		self.selected = index

		if not skip_cb then
			self.on_point_scroll:trigger(self:get_context(), index, self.points[index])
		end
	end

	self:scroll_to(self.points[index])
end





function M:scroll_to_percent(percent, is_instant)
	local border = self.available_pos

	local pos = vmath.vector3(
		-helper.lerp(border.x, border.z, 1 - percent.x),
		-helper.lerp(border.y, border.w, 1 - percent.y),
		0
	)

	if not self.drag.can_x then
		pos.x = self.position.x
	end
	if not self.drag.can_y then
		pos.y = self.position.y
	end

	self:scroll_to(pos, is_instant)
end





function M:get_percent()
	local x_perc = 1 - self:_inverse_lerp(self.available_pos.x, self.available_pos.z, self.position.x)
	local y_perc = self:_inverse_lerp(self.available_pos.w, self.available_pos.y, self.position.y)

	return vmath.vector3(x_perc, y_perc, 0)
end







function M:set_size(size, offset)
	if offset then
		self._offset = offset
	end
	gui.set_size(self.content_node, size)
	self:_update_size()

	return self
end





function M:set_view_size(size)
	gui.set_size(self.view_node, size)
	self.view_size = size
	self.view_border = helper.get_border(self.view_node)
	self:_update_size()

	return self
end




function M:update_view_size()
	self.view_size = helper.get_scaled_size(self.view_node)
	self.view_border = helper.get_border(self.view_node)
	self:_update_size()

	return self
end







function M:set_inert(state)
	self._is_inert = state

	return self
end




function M:is_inert()
	return self._is_inert
end






function M:set_extra_stretch_size(stretch_size)
	self.style.EXTRA_STRETCH_SIZE = stretch_size or 0
	self:_update_size()

	return self
end




function M:get_scroll_size()
	return self.available_size
end






function M:set_points(points)
	self.points = points

	table.sort(self.points, function(a, b)
		return a.x > b.x or a.y < b.y
	end)

	self:_check_threshold()

	return self
end





function M:set_horizontal_scroll(state)
	self._is_horizontal_scroll = state
	self.drag.can_x = self.available_size.x > 0 and state or false
	return self
end





function M:set_vertical_scroll(state)
	self._is_vertical_scroll = state
	self.drag.can_y = self.available_size.y > 0 and state or false
	return self
end






function M:is_node_in_view(node)
	local node_offset_for_view = gui.get_position(node)
	local parent = gui.get_parent(node)
	local is_parent_of_view = false
	while parent do
		if parent ~= self.view_node then
			local parent_pos = gui.get_position(parent)
			node_offset_for_view.x = node_offset_for_view.x + parent_pos.x
			node_offset_for_view.y = node_offset_for_view.y + parent_pos.y
			parent = gui.get_parent(parent)
		else
			is_parent_of_view = true
			parent = nil
		end
	end
	if not is_parent_of_view then
		error("The node to check is_node_in_view should be child if scroll view")
		return false
	end

	local node_border = helper.get_border(node, node_offset_for_view)

	
	if node_border.z < self.view_border.x or node_border.x > self.view_border.z then
		return false
	end

	
	if node_border.w > self.view_border.y or node_border.y < self.view_border.w then
		return false
	end

	return true
end






function M:bind_grid(grid)
	if self._grid_on_change then
		self._grid_on_change:unsubscribe(self._grid_on_change_callback)

		self._grid_on_change = nil
		self._grid_on_change_callback = nil
	end

	if not grid then
		return self
	end

	self._grid_on_change = grid.on_change_items
	self._grid_on_change_callback = function()
		local size = grid:get_size()
		local offset = grid:get_offset()
		self:set_size(size, offset)
	end
	self._grid_on_change:subscribe(self._grid_on_change_callback)
	self:set_size(grid:get_size(), grid:get_offset())

	return self
end






function M:bind_layout(layout)
	if self._layout_on_change then
		self._layout_on_change:unsubscribe(self._layout_on_change_callback)

		self._layout_on_change = nil
		self._layout_on_change_callback = nil
	end

	if not layout then
		return self
	end

	self._layout_on_change = layout.on_size_changed
	self._layout_on_change_callback = function(size)
		self:set_size(size)
	end
	self._layout_on_change:subscribe(self._layout_on_change_callback)
	self:set_size(layout:get_size())

	return self
end





function M:set_click_zone(node)
	self.drag:set_click_zone(node)
end


function M:_on_scroll_drag(dx, dy)
	local t = self.target_position
	local b = self.available_pos
	local eb = self.available_pos_extra

	
	
	local x_perc = 1
	local y_perc = 1

	
	if t.x < b.x and dx < 0 then
		x_perc = self:_inverse_lerp(eb.x, b.x, t.x)
	end
	
	if t.x > b.z and dx > 0 then
		x_perc = self:_inverse_lerp(eb.z, b.z, t.x)
	end
	
	if not self.drag.can_x then
		x_perc = 0
	end

	
	if t.y < b.y and dy < 0 then
		y_perc = self:_inverse_lerp(eb.y, b.y, t.y)
	end
	
	if t.y > b.w and dy > 0 then
		y_perc = self:_inverse_lerp(eb.w, b.w, t.y)
	end
	
	if not self.drag.can_y then
		y_perc = 0
	end

	t.x = t.x + dx * x_perc
	t.y = t.y + dy * y_perc
end


function M:_check_soft_zone()
	local target = self.target_position
	local border = self.available_pos
	local speed = self.style.BACK_SPEED

	
	if target.x < border.x then
		local step = math.max(math.abs(target.x - border.x) * speed, 1)
		target.x = helper.step(target.x, border.x, step)
	end
	
	if target.x > border.z then
		local step = math.max(math.abs(target.x - border.z) * speed, 1)
		target.x = helper.step(target.x, border.z, step)
	end
	
	if target.y < border.y then
		local step = math.max(math.abs(target.y - border.y) * speed, 1)
		target.y = helper.step(target.y, border.y, step)
	end
	
	if target.y > border.w then
		local step = math.max(math.abs(target.y - border.w) * speed, 1)
		target.y = helper.step(target.y, border.w, step)
	end
end



function M:_cancel_animate()
	self.inertion.x = 0
	self.inertion.y = 0

	if self.is_animate then
		self.target_position = gui.get_position(self.content_node)
		self.position.x = self.target_position.x
		self.position.y = self.target_position.y
		gui.cancel_animation(self.content_node, gui.PROP_POSITION)
		self.is_animate = false
	end
end


function M:_set_scroll_position(position_x, position_y)
	local available_extra = self.available_pos_extra
	position_x = helper.clamp(position_x, available_extra.x, available_extra.z)
	position_y = helper.clamp(position_y, available_extra.w, available_extra.y)

	if self.position.x ~= position_x or self.position.y ~= position_y then
		self.position.x = position_x
		self.position.y = position_y
		gui.set_position(self.content_node, self.position)

		self.on_scroll:trigger(self:get_context(), self.position)
	end
end






function M:_check_points()
	if not self.points then
		return
	end

	local inert = self.inertion
	if not self._is_inert then
		if math.abs(inert.x) > self.style.POINTS_DEADZONE then
			self:scroll_to_index(self.selected + helper.sign(inert.x))
			return
		end
		if math.abs(inert.y) > self.style.POINTS_DEADZONE then
			self:scroll_to_index(self.selected + helper.sign(inert.y))
			return
		end
	end

	
	

	local temp_dist = math.huge
	local temp_dist_on_inert = math.huge
	local index = -1
	local index_on_inert = -1
	local pos = self.position

	for i = 1, #self.points do
		local p = self.points[i]
		local dist = helper.distance(pos.x, pos.y, -p.x, -p.y)
		local on_inert = true
		
		if inert.x ~= 0 and helper.sign(inert.x) ~= helper.sign(-p.x - pos.x) then
			on_inert = false
		end
		if inert.y ~= 0 and helper.sign(inert.y) ~= helper.sign(-p.y - pos.y) then
			on_inert = false
		end

		if dist < temp_dist then
			index = i
			temp_dist = dist
		end
		if on_inert and dist < temp_dist_on_inert then
			index_on_inert = i
			temp_dist_on_inert = dist
		end
	end

	if index_on_inert >= 0 then
		self:scroll_to_index(index_on_inert)
	else
		self:scroll_to_index(index)
	end
end


function M:_check_threshold()
	local is_stopped = false

	if self.drag.can_x and math.abs(self.inertion.x) < self.style.INERT_THRESHOLD then
		is_stopped = true
		self.inertion.x = 0
	end
	if self.drag.can_y and math.abs(self.inertion.y) < self.style.INERT_THRESHOLD then
		is_stopped = true
		self.inertion.y = 0
	end

	if is_stopped or not self._is_inert then
		self:_check_points()
	end
end


function M:_update_free_scroll(dt)
	if self.is_animate then
		return
	end

	local target = self.target_position

	if self._is_inert and (self.inertion.x ~= 0 or self.inertion.y ~= 0) then
		
		target.x = self.position.x + self.inertion.x * self.style.INERT_SPEED * dt
		target.y = self.position.y + self.inertion.y * self.style.INERT_SPEED * dt

		self:_check_threshold()
	end

	
	self.inertion = self.inertion * self.style.FRICT

	self:_check_soft_zone()
	if self.position.x ~= target.x or self.position.y ~= target.y then
		self:_set_scroll_position(target.x, target.y)
	end
end


function M:_update_hand_scroll(dt)
	if self.is_animate then
		self:_cancel_animate()
	end

	local dx = self.target_position.x - self.position.x
	local dy = self.target_position.y - self.position.y

	self.inertion.x = (self.inertion.x + dx) * self.style.FRICT_HOLD
	self.inertion.y = (self.inertion.y + dy) * self.style.FRICT_HOLD

	self:_set_scroll_position(self.target_position.x, self.target_position.y)
end


function M:_on_touch_start()
	self.inertion.x = 0
	self.inertion.y = 0
	self.target_position.x = self.position.x
	self.target_position.y = self.position.y
end


function M:_on_touch_end()
	self:_check_threshold()
end


function M:_update_size()
	local content_border = helper.get_border(self.content_node)
	local content_size = helper.get_scaled_size(self.content_node)

	self.available_pos = self:_get_border_vector(self.view_border - content_border, self._offset)
	self.available_size = self:_get_size_vector(self.available_pos)

	self.drag.can_x = self.available_size.x > 0 and self._is_horizontal_scroll
	self.drag.can_y = self.available_size.y > 0 and self._is_vertical_scroll

	
	
	
	local content_border_extra = helper.get_border(self.content_node)
	local stretch_size = self.style.EXTRA_STRETCH_SIZE

	local sign_x = content_size.x > self.view_size.x and 1 or -1
	content_border_extra.x = content_border_extra.x - stretch_size * sign_x
	content_border_extra.z = content_border_extra.z + stretch_size * sign_x

	local sign_y = content_size.y > self.view_size.y and 1 or -1
	content_border_extra.y = content_border_extra.y + stretch_size * sign_y
	content_border_extra.w = content_border_extra.w - stretch_size * sign_y

	if not self.style.SMALL_CONTENT_SCROLL then
		self.drag.can_x = content_size.x > self.view_size.x and self._is_horizontal_scroll
		self.drag.can_y = content_size.y > self.view_size.y and self._is_vertical_scroll
	end

	self.available_pos_extra = self:_get_border_vector(self.view_border - content_border_extra, self._offset)
	self.available_size_extra = self:_get_size_vector(self.available_pos_extra)

	self:_set_scroll_position(self.position.x, self.position.y)
	self.target_position.x = self.position.x
	self.target_position.y = self.position.y

	self.drag:set_drag_cursors(self.drag.can_x or self.drag.can_y)
end


function M:_process_scroll_wheel(action_id, action)
	if not self._is_mouse_hover or self.style.WHEEL_SCROLL_SPEED == 0 then
		return false
	end

	if action_id ~= const.ACTION_SCROLL_UP and action_id ~= const.ACTION_SCROLL_DOWN then
		return false
	end

	local koef = (action_id == const.ACTION_SCROLL_UP) and 1 or -1
	if self.style.WHEEL_SCROLL_INVERTED then
		koef = -koef
	end

	if self.style.WHEEL_SCROLL_BY_INERTION then
		if self.drag.can_y then
			self.inertion.y = (self.inertion.y + self.style.WHEEL_SCROLL_SPEED * koef) * self.style.FRICT_HOLD
		elseif self.drag.can_x then
			self.inertion.x = (self.inertion.x + self.style.WHEEL_SCROLL_SPEED * koef) * self.style.FRICT_HOLD
		end
	else
		if self.drag.can_y then
			self.target_position.y = self.target_position.y + self.style.WHEEL_SCROLL_SPEED * koef
			self.inertion.y = 0
		elseif self.drag.can_x then
			self.target_position.x = self.target_position.x + self.style.WHEEL_SCROLL_SPEED * koef
			self.inertion.x = 0
		end

		self:_set_scroll_position(self.target_position.x, self.target_position.y)
		self:_check_points()
	end

	return true
end


function M:_on_mouse_hover(state)
	self._is_mouse_hover = state
end


function M:_inverse_lerp(min, max, current)
	return helper.clamp((current - min) / (max - min), 0, 1)
end








function M:_get_border_vector(vector, offset)
	if vector.x > vector.z then
		vector.x, vector.z = vector.z, vector.x
	end
	if vector.y > vector.w then
		vector.y, vector.w = vector.w, vector.y
	end
	vector.x = vector.x - offset.x
	vector.z = vector.z - offset.x
	vector.y = vector.y - offset.y
	vector.w = vector.w - offset.y
	return vector
end





function M:_get_size_vector(vector)
	return vmath.vector3(vector.z - vector.x, vector.w - vector.y, 0)
end


return M
