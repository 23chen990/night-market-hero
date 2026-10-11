local event = require("event.event")
local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")
















































local M = component.create("button")







function M:init(node_or_node_id, callback, custom_args, anim_node)
	self.druid = self:get_druid()
	self.node = self:get_node(node_or_node_id)
	self.node_id = gui.get_id(self.node)

	self.anim_node = anim_node and self:get_node(anim_node) or self.node
	self.start_scale = gui.get_scale(self.anim_node)
	self.start_pos = gui.get_position(self.anim_node)
	self.params = custom_args
	self.hover = self.druid:new_hover(node_or_node_id, self._on_button_hover)
	self.hover.on_mouse_hover:subscribe(self._on_button_mouse_hover)
	self.click_zone = nil
	self.is_repeated_started = false
	self.last_pressed_time = 0
	self.last_released_time = 0
	self.click_in_row = 0
	self.key_trigger = nil

	self._check_function = nil
	self._failure_callback = nil
	self._is_html5_mode = false
	self._is_html5_listener_set = false

	
	self.on_click = event.create(callback)
	self.on_pressed = event.create()
	self.on_repeated_click = event.create()
	self.on_long_click = event.create()
	self.on_double_click = event.create()
	self.on_hold_callback = event.create()
	self.on_click_outside = event.create()
end




function M:on_style_change(style)
	self.style = {
		LONGTAP_TIME = style.LONGTAP_TIME or 0.4,
		AUTOHOLD_TRIGGER = style.AUTOHOLD_TRIGGER or 0.8,
		DOUBLETAP_TIME = style.DOUBLETAP_TIME or 0.4,

		on_click = style.on_click or function(_, node) end,
		on_click_disabled = style.on_click_disabled or function(_, node) end,
		on_mouse_hover = style.on_mouse_hover or function(_, node, state) end,
		on_hover = style.on_hover or function(_, node, state) end,
		on_set_enabled = style.on_set_enabled or function(_, node, state) end,
	}
end




function M:set_animations_disabled()
	local empty_function = function() end

	self.style.on_click = empty_function
	self.style.on_hover = empty_function
	self.style.on_mouse_hover = empty_function
	self.style.on_set_enabled = empty_function
	self.style.on_click_disabled = empty_function

	return self
end



function M:on_late_init()
	if not self.click_zone then
		local stencil_node = helper.get_closest_stencil_node(self.node)
		if stencil_node then
			self:set_click_zone(stencil_node)
		end
	end
end






function M:on_input(action_id, action)
	if not self:_is_input_match(action_id) then
		return false
	end

	if not gui.is_enabled(self.node, true) then
		return false
	end

	local is_consume = true
	local is_pick = true
	local is_key_trigger = (action_id == self.key_trigger)
	if not is_key_trigger then
		is_pick = helper.pick_node(self.node, action.x, action.y, self.click_zone)
	end

	if not is_pick then
		
		self.can_action = false
		if action.released then
			self.on_click_outside:trigger(self:get_context(), self.params, self)
		end

		if self._is_html5_mode and self._is_html5_listener_set then
			self._is_html5_listener_set = false
			html5.set_interaction_listener(nil)
		end
		return false
	end

	if is_key_trigger then
		self.hover:set_hover(not action.released)
		is_consume = false
	end

	if action.pressed then
		
		self.can_action = true
		self.is_repeated_started = false
		self.last_pressed_time = socket.gettime()
		self.on_pressed:trigger(self:get_context(), self.params, self)

		if self._is_html5_mode then
			self._is_html5_listener_set = true
			html5.set_interaction_listener(function()
				self:_on_button_click()
			end)
		end
		return is_consume
	end

	
	if action.repeated then
		if not self.on_repeated_click:is_empty() and self.can_action then
			self:_on_button_repeated_click()
			return is_consume
		end
	end

	if action.released then
		return self:_on_button_release() and is_consume
	end

	if self.can_action and not self.on_long_click:is_empty() then
		local press_time = socket.gettime() - self.last_pressed_time

		if self.style.AUTOHOLD_TRIGGER <= press_time then
			self:_on_button_release()
			return is_consume
		end

		if press_time >= self.style.LONGTAP_TIME then
			self:_on_button_hold(press_time)
			return is_consume
		end
	end

	return not self.disabled and is_consume
end



function M:on_input_interrupt()
	self.can_action = false
	self.hover:set_hover(false)
	self.hover:set_mouse_hover(false)
end







function M:set_enabled(state)
	self.disabled = not state
	self.hover:set_enabled(state)
	self.style.on_set_enabled(self, self.node, state)

	return self
end





function M:is_enabled()
	return not self.disabled
end







function M:set_click_zone(zone)
	self.click_zone = zone and self:get_node(zone) or nil
	self.hover:set_click_zone(zone)

	return self
end





function M:set_key_trigger(key)
	if type(key) == "string" then
		self.key_trigger = hash(key)
	else
		self.key_trigger = key
	end

	return self
end




function M:get_key_trigger()
	return self.key_trigger
end






function M:set_check_function(check_function, failure_callback)
	self._check_function = check_function
	self._failure_callback = failure_callback

	return self
end










function M:set_web_user_interaction(is_web_mode)
	self._is_html5_mode = not not (is_web_mode and html5)
	return self
end




function M:_is_input_match(action_id)
	if action_id == const.ACTION_TOUCH or action_id == const.ACTION_MULTITOUCH then
		return true
	end

	if self.key_trigger and action_id == self.key_trigger then
		return true
	end

	return false
end



function M:_on_button_hover(hover_state)
	self.style.on_hover(self, self.anim_node, hover_state)
end



function M:_on_button_mouse_hover(hover_state)
	self.style.on_mouse_hover(self, self.anim_node, hover_state)
end


function M:_on_button_click()
	if self._is_html5_mode then
		self._is_html5_listener_set = false
		html5.set_interaction_listener(nil)
	end
	self.click_in_row = 1
	self.on_click:trigger(self:get_context(), self.params, self)
	self.style.on_click(self, self.anim_node)
end


function M:_on_button_repeated_click()
	if not self.is_repeated_started then
		self.click_in_row = 0
		self.is_repeated_started = true
	end

	self.click_in_row = self.click_in_row + 1
	self.on_repeated_click:trigger(self:get_context(), self.params, self, self.click_in_row)
	self.style.on_click(self, self.anim_node)
end


function M:_on_button_long_click()
	self.click_in_row = 1
	local time = socket.gettime() - self.last_pressed_time
	self.on_long_click:trigger(self:get_context(), self.params, self, time)
	self.style.on_click(self, self.anim_node)
end


function M:_on_button_double_click()
	self.click_in_row = self.click_in_row + 1
	self.on_double_click:trigger(self:get_context(), self.params, self, self.click_in_row)
	self.style.on_click(self, self.anim_node)
end



function M:_on_button_hold(press_time)
	self.on_hold_callback:trigger(self:get_context(), self.params, self, press_time)
end


function M:_on_button_release()
	if self.is_repeated_started then
		return false
	end

	local check_function_result = true
	if self._check_function then
		check_function_result = self._check_function(self:get_context())
	end

	if self.disabled then
		self.style.on_click_disabled(self, self.anim_node)
		return true
	elseif not check_function_result then
		if self._failure_callback then
			self._failure_callback(self:get_context())
		end
		return true
	else
		if self.can_action and not self._is_html5_mode then
			self.can_action = false

			local time = socket.gettime()
			local is_long_click = (time - self.last_pressed_time) >= self.style.LONGTAP_TIME
			is_long_click = is_long_click and not self.on_long_click:is_empty()

			local is_double_click = (time - self.last_released_time) < self.style.DOUBLETAP_TIME
			is_double_click = is_double_click and not self.on_double_click:is_empty()

			if is_long_click then
				local is_hold_complete = (time - self.last_pressed_time) >= self.style.AUTOHOLD_TRIGGER
				if is_hold_complete then
					self:_on_button_long_click()
				else
					self.on_click_outside:trigger(self:get_context(), self.params, self)
				end
			elseif is_double_click then
				self:_on_button_double_click()
			else
				self:_on_button_click()
			end

			self.last_released_time = time
		end
		return true
	end
end


return M
