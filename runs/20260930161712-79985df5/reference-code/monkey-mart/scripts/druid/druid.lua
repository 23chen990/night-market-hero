local event = require("event.event")
local events = require("event.events")
local settings = require("druid.system.settings")
local druid_instance = require("druid.system.druid_instance")

local default_style = require("druid.styles.default.style")





local M = {}






function M.new(context, style)
	if settings.default_style == nil then
		M.set_default_style(default_style)
	end

	return druid_instance.create_druid_instance(context, style)
end









function M.register(name, module)
	local is_custom_component = getmetatable(module) ~= nil
	if is_custom_component then
		druid_instance["new_" .. name] = function(self, ...)
			return druid_instance.new(self, module, ...)
		end
	else
		
		druid_instance["new_" .. name] = function(self, template, nodes, ...)
			return druid_instance.new_widget(self, module, template, nodes, ...)
		end
	end
end




function M.set_default_style(style)
	settings.default_style = style or {}
end




function M.set_text_function(callback)
	settings.get_text = callback or function() end
	M.on_language_change()
end




function M.set_sound_function(callback)
	settings.play_sound = callback or function() end
end




function M.init_window_listener()
	window.set_listener(function(_, window_event)
		events.trigger("druid.window_event", window_event)
	end)
end




function M.on_window_callback(window_event)
	events.trigger("druid.window_event", window_event)
end




function M.on_language_change()
	events.trigger("druid.language_change")
end



local REGISTERED_GUI_WIDGETS = {}





local function wrap_widget(widget)
	
	
	local wrapped_widget = setmetatable({}, { __index = widget })
	local parent_table = getmetatable(widget).__index

	
	for key, value in pairs(parent_table) do
		if type(value) == "function" then
			wrapped_widget[key] = event.create(function(_, ...)
				return value(widget, ...)
			end)
		end
	end

	return wrapped_widget
end












function M.get_widget(widget_class, gui_url)
	gui_url = gui_url or msg.url()
	local registered_druids = REGISTERED_GUI_WIDGETS[gui_url.socket]
	if not registered_druids then
		return nil
	end

	for index = 1, #registered_druids do
		local druid = registered_druids[index]
		if druid.fragment == gui_url.fragment and druid.path == gui_url.path then
			return druid.new_widget:trigger(widget_class)
		end
	end

	return nil
end






function M.register_druid_as_widget(druid)
	local gui_url = msg.url()
	REGISTERED_GUI_WIDGETS[gui_url.socket] = REGISTERED_GUI_WIDGETS[gui_url.socket] or {}
	table.insert(REGISTERED_GUI_WIDGETS[gui_url.socket], {
		path = gui_url.path,
		fragment = gui_url.fragment,
		new_widget = event.create(function(widget_class)
			return wrap_widget(druid:new_widget(widget_class))
		end),
	})
end



function M.unregister_druid_as_widget()
	local gui_url = msg.url()
	local socket = gui_url.socket
	local path = gui_url.path
	local fragment = gui_url.fragment

	for index = 1, #REGISTERED_GUI_WIDGETS[socket] do
		local gui = REGISTERED_GUI_WIDGETS[socket][index]
		if gui.path == path and gui.fragment == fragment then
			table.remove(REGISTERED_GUI_WIDGETS[socket], index)
			break
		end
	end

	if #REGISTERED_GUI_WIDGETS[socket] == 0 then
		REGISTERED_GUI_WIDGETS[socket] = nil
	end
end


return M
