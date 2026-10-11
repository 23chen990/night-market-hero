local event = require("event.event")
local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")

















local M = component.create("swipe")




function M:init(node_or_node_id, on_swipe_callback)
	self._trigger_on_move = self.style.SWIPE_TRIGGER_ON_MOVE
	self.node = self:get_node(node_or_node_id)

	self._swipe_start_time = 0
	self._start_pos = vmath.vector3(0)

	self.click_zone = nil
	self.on_swipe = event.create(on_swipe_callback)
end



function M:on_late_init()
	if not self.click_zone then
		local stencil_node = helper.get_closest_stencil_node(self.node)
		if stencil_node then
			self:set_click_zone(stencil_node)
		end
	end
end




function M:on_style_change(style)
	self.style = {
		SWIPE_TIME = style.SWIPE_TIME or 0.4,
		SWIPE_THRESHOLD = style.SWIPE_THRESHOLD or 50,
		SWIPE_TRIGGER_ON_MOVE = style.SWIPE_TRIGGER_ON_MOVE or false,
	}
end






function M:on_input(action_id, action)
	if action_id ~= const.ACTION_TOUCH then
		return false
	end

	if not gui.is_enabled(self.node, true) then
		return false
	end

	local is_pick = helper.pick_node(self.node, action.x, action.y, self.click_zone)
	if not is_pick then
		self:_reset_swipe()
		return false
	end

	if self._swipe_start_time ~= 0 and (self._trigger_on_move or action.released) then
		self:_check_swipe(action)
	end

	if action.pressed then
		self:_start_swipe(action)
	end

	if action.released then
		self:_reset_swipe()
	end

	return true
end



function M:on_input_interrupt()
	self:_reset_swipe()
end




function M:set_click_zone(zone)
	if not zone then
		self.click_zone = nil
		return
	end

	self.click_zone = self:get_node(zone)
end




function M:_start_swipe(action)
	self._swipe_start_time = socket.gettime()
	self._start_pos.x = action.x
	self._start_pos.y = action.y
end



function M:_reset_swipe()
	self._swipe_start_time = 0
end





function M:_check_swipe(action)
	local dx = action.x - self._start_pos.x
	local dy = action.y - self._start_pos.y
	local dist = helper.distance(self._start_pos.x, self._start_pos.y, action.x, action.y)
	local delta_time = socket.gettime() - self._swipe_start_time
	local is_swipe = self.style.SWIPE_THRESHOLD <= dist and delta_time <= self.style.SWIPE_TIME

	if is_swipe then
		local is_x_swipe = math.abs(dx) >= math.abs(dy)
		local swipe_side = "undefined"

		if is_x_swipe and dx > 0 then
			swipe_side = "right"
		end
		if is_x_swipe and dx < 0 then
			swipe_side = "left"
		end
		if not is_x_swipe and dy > 0 then
			swipe_side = "up"
		end
		if not is_x_swipe and dy < 0 then
			swipe_side = "down"
		end

		self.on_swipe:trigger(self:get_context(), swipe_side, dist, delta_time)
		self:_reset_swipe()
	end
end


return M
