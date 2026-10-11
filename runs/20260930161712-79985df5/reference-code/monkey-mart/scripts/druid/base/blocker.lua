local const = require("druid.const")
local component = require("druid.component")













local M = component.create("blocker")




function M:init(node)
	self.node = self:get_node(node)
	self._is_enabled = gui.is_enabled(self.node, true)
end






function M:on_input(action_id, action)
	if action_id ~= const.ACTION_TOUCH and
		action_id ~= const.ACTION_MULTITOUCH and
		action_id ~= nil then
		return false
	end

	if not self:is_enabled() then
		return false
	end

	if not gui.is_enabled(self.node, true) then
		return false
	end

	if gui.pick_node(self.node, action.x, action.y) then
		return true
	end

	return false
end





function M:set_enabled(state)
	self._is_enabled = state

	return self
end




function M:is_enabled()
	return self._is_enabled
end


return M
