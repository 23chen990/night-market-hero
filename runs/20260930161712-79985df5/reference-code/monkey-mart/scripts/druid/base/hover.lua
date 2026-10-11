local event = require("event.event")
local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")
















local M = component.create("hover")






function M:init(node, on_hover_callback, on_mouse_hover)
	self.node = self:get_node(node)

	self._is_hovered = false
	self._is_mouse_hovered = false
	self._is_enabled = true
	self._is_mobile = helper.is_mobile()

	self.on_hover = event.create(on_hover_callback)
	self.on_mouse_hover = event.create(on_mouse_hover)
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
	self.style = {}
	self.style.ON_HOVER_CURSOR = style.ON_HOVER_CURSOR or nil
	self.style.ON_MOUSE_HOVER_CURSOR = style.ON_MOUSE_HOVER_CURSOR or nil
end






function M:on_input(action_id, action)
	if action_id ~= const.ACTION_TOUCH and action_id ~= nil then
		return false
	end

	
	if self._is_mobile and not action_id then
		return false
	end

	if not gui.is_enabled(self.node, true) or not self._is_enabled then
		self:set_hover(false)
		self:set_mouse_hover(false)
		return false
	end

	local is_pick = helper.pick_node(self.node, action.x, action.y, self.click_zone)
	local hover_function = action_id and self.set_hover or self.set_mouse_hover

	if not is_pick then
		hover_function(self, false)
		return false
	end

	if action.released then
		hover_function(self, false)
	else
		hover_function(self, true)
	end

	return false
end



function M:on_input_interrupt()
	self:set_hover(false)
end




function M:set_hover(state)
	if self._is_hovered == state then
		return
	end

	self._is_hovered = state
	self.on_hover:trigger(self:get_context(), state, self)

	if defos and self.style.ON_HOVER_CURSOR then
		self:_set_cursor(3, state and self.style.ON_HOVER_CURSOR or nil)
	end
end




function M:is_hovered()
	return self._is_hovered
end




function M:set_mouse_hover(state)
	if self._is_mouse_hovered == state then
		return
	end

	self._is_mouse_hovered = state
	self.on_mouse_hover:trigger(self:get_context(), state, self)

	if defos and self.style.ON_MOUSE_HOVER_CURSOR then
		self:_set_cursor(2, state and self.style.ON_MOUSE_HOVER_CURSOR or nil)
	end
end




function M:is_mouse_hovered()
	return self._is_mouse_hovered
end




function M:set_click_zone(zone)
	if not zone then
		self.click_zone = nil
		return
	end

	self.click_zone = self:get_node(zone)
end






function M:set_enabled(state)
	self._is_enabled = state

	if not state then
		if self._is_hovered then
			self:set_hover(false)
		end
		if self._is_mouse_hovered then
			self:set_mouse_hover(false)
		end
	end
end




function M:is_enabled()
	return self._is_enabled
end



local cursor_stack = {}

function M:_set_cursor(priority, cursor)
	if not defos then
		return
	end

	local uid = self:get_uid()
	cursor_stack[uid] = cursor_stack[uid] or {}
	cursor_stack[uid][priority] = cursor

	
	local priority = nil
	local cursor_to_set = nil
	for _, stack in pairs(cursor_stack) do
		for pr, _ in pairs(stack) do
			if pr > (priority or 0) then
				priority = pr
				cursor_to_set = stack[priority]
			end
		end
	end

	defos.set_cursor(cursor_to_set)
end


return M
