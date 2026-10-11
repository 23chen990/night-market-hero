local event = require("event.event")
local component = require("druid.component")
local settings = require("druid.system.settings")

















local M = component.create("lang_text")





function M:init(node, locale_id, adjust_type)
	self.druid = self:get_druid()
	self.text = self.druid:new_text(node, locale_id, adjust_type)
	self.node = self.text.node
	self.last_locale_args = {}

	self.on_change = event.create()

	self:translate(locale_id or gui.get_text(self.node))
	self.text.on_set_text:subscribe(self.on_change.trigger, self.on_change)

	return self
end



function M:on_language_change()
	if self.last_locale then
		self:translate(self.last_locale, unpack(self.last_locale_args))
	end
end





function M:set_to(text)
	self.last_locale = nil
	self.text:set_text(text)
	self.on_change:trigger()

	return self
end





function M:set_text(text)
	return self:set_to(text)
end






function M:translate(locale_id, ...)
	self.last_locale_args = { ... }
	self.last_locale = locale_id or self.last_locale
	self.text:set_text(settings.get_text(self.last_locale, ...) or "")

	return self
end





function M:format(...)
	self.last_locale_args = { ... }
	self.text:set_text(settings.get_text(self.last_locale, ...) or "")

	return self
end


return M
