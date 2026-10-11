local event = require("event.event")
local const = require("druid.const")
local component = require("druid.component")












local M = component.create("back_handler")





function M:init(callback, params)
	self.params = params
	self.on_back = event.create(callback)
end






function M:on_input(action_id, action)
	if action.released and (action_id == const.ACTION_BACK or action_id == const.ACTION_BACKSPACE) then
		self.on_back:trigger(self:get_context(), self.params)
		return true
	end

	return false
end


return M
