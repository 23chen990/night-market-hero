

local events = require("event.events")
local const = require("druid.const")
local helper = require("druid.helper")
local settings = require("druid.system.settings")
local druid_component = require("druid.component")













local M = {}

local IS_NO_AUTO_INPUT = sys.get_config_int("druid.no_auto_input", 0) == 1
local INTERESTS_CACHE = {} 
local DRUID_INSTANCE_METATABLE = { __index = M }

local function set_input_state(self, is_input_inited)
	if IS_NO_AUTO_INPUT or (self.input_inited == is_input_inited) then
		return
	end

	self.input_inited = is_input_inited
	msg.post(".", is_input_inited and "acquire_input_focus" or "release_input_focus")
end






local function sort_input_comparator(component_a, component_b)
	local a_priority = component_a:get_input_priority()
	local b_priority = component_b:get_input_priority()

	if a_priority ~= b_priority then
		return a_priority < b_priority
	end

	return component_a:get_uid() < component_b:get_uid()
end


local function sort_input_stack(self)
	local input_components = self.components_interest[const.ON_INPUT]
	if not input_components then
		return
	end

	table.sort(input_components, sort_input_comparator)
end





local function get_component_interests(instance)
	
	local instance_class = instance._meta.instance_class
	if INTERESTS_CACHE[instance_class] then
		return INTERESTS_CACHE[instance_class]
	end

	local interests = {}
	for index = 1, #const.ALL_INTERESTS do
		local interest = const.ALL_INTERESTS[index]
		if instance[interest] and type(instance[interest]) == "function" then
			table.insert(interests, interest)
		end
	end

	INTERESTS_CACHE[instance_class] = interests
	return INTERESTS_CACHE[instance_class]
end





local function register_interests(self, instance)
	table.insert(self.components_all, instance)
	local interest_list = get_component_interests(instance)
	for i = 1, #interest_list do
		local interest = interest_list[i]
		table.insert(self.components_interest[interest], instance)
	end
end






local function create(self, instance_class)
	local instance = instance_class()
	instance:setup_component(self, self:get_context(), self:get_style(), instance_class)
	register_interests(self, instance)

	return instance
end






local function create_widget(self, widget_class)
	local instance = druid_component.create_widget(self, widget_class, self:get_context())
	register_interests(self, instance)

	return instance
end





local function check_sort_input_stack(self, components)
	if not components or #components == 0 then
		return
	end

	local is_need_sort_input_stack = false

	for i = #components, 1, -1 do
		local component = components[i]
		if component:_is_input_priority_changed() then
			is_need_sort_input_stack = true
			component:_reset_input_priority_changed()
		end
	end

	if is_need_sort_input_stack then
		sort_input_stack(self)
	end
end





function M:_can_use_input_component(component)
	local can_by_whitelist = true
	local can_by_blacklist = true

	if self._input_whitelist and #self._input_whitelist > 0 then
		can_by_whitelist = not not helper.contains(self._input_whitelist, component)
	end

	if self._input_blacklist and #self._input_blacklist > 0 then
		can_by_blacklist = not helper.contains(self._input_blacklist, component)
	end

	return can_by_blacklist and can_by_whitelist
end


local function schedule_late_init(self)
	if self._late_init_timer_id then
		return
	end

	self._late_init_timer_id = timer.delay(0, false, function()
		self._late_init_timer_id = nil
		self:late_init()
	end)
end






function M.create_druid_instance(context, style)
	local self = setmetatable({}, DRUID_INSTANCE_METATABLE)

	self._context = context
	self._style = style or settings.default_style
	self._is_late_remove_enabled = false
	self._late_remove = {}

	self._input_blacklist = nil
	self._input_whitelist = nil

	self.components_all = {}
	self.components_interest = {}
	for i = 1, #const.ALL_INTERESTS do
		self.components_interest[const.ALL_INTERESTS[i]] = {}
	end

	events.subscribe("druid.window_event", self.on_window_event, self)
	events.subscribe("druid.language_change", self.on_language_change, self)

	return self
end







function M:new(component, ...)
	local instance = create(self, component)

	if instance.init then
		instance:init(...)
	end

	if instance.on_late_init or (not self.input_inited and instance.on_input) then
		schedule_late_init(self)
	end

	return instance
end



function M:final()
	local components = self.components_all

	for i = #components, 1, -1 do
		if components[i].on_remove then
			components[i]:on_remove()
		end
	end

	set_input_state(self, false)

	events.unsubscribe("druid.window_event", self.on_window_event, self)
	events.unsubscribe("druid.language_change", self.on_language_change, self)
end








function M:remove(component)
	if self._is_late_remove_enabled then
		table.insert(self._late_remove, component)
		return false
	end

	
	local children = component._meta.children
	for i = #children, 1, -1 do
		self:remove(children[i])
		children[i] = nil
	end

	local parent = component:get_parent_component()
	if parent then
		parent:__remove_child(component)
	end

	local is_removed = false

	local all_components = self.components_all
	for i = #all_components, 1, -1 do
		if all_components[i] == component then
			if component.on_remove then
				component:on_remove()
			end
			table.remove(all_components, i)
			is_removed = true
		end
	end

	local interest_list = get_component_interests(component)
	for i = 1, #interest_list do
		local interest = interest_list[i]
		local components = self.components_interest[interest]
		for j = #components, 1, -1 do
			if components[j] == component then
				table.remove(components, j)
			end
		end
	end

	return is_removed
end





function M:get_context()
	return self._context
end





function M:get_style()
	return self._style
end






function M:late_init()
	local late_init_components = self.components_interest[const.ON_LATE_INIT]
	while late_init_components[1] do
		late_init_components[1]:on_late_init()
		table.remove(late_init_components, 1)
	end

	if not self.input_inited and #self.components_interest[const.ON_INPUT] > 0 then
		
		set_input_state(self, true)
	end
end




function M:update(dt)
	self._is_late_remove_enabled = true

	local components = self.components_interest[const.ON_UPDATE]
	for i = 1, #components do
		components[i]:update(dt)
	end

	self._is_late_remove_enabled = false
	self:_clear_late_remove()
end






function M:on_input(action_id, action)
	self._is_late_remove_enabled = true

	local components = self.components_interest[const.ON_INPUT]
	check_sort_input_stack(self, components)

	local is_input_consumed = false

	for i = #components, 1, -1 do
		local component = components[i]
		local input_enabled = component:get_input_enabled()

		if input_enabled and self:_can_use_input_component(component) then
			if not is_input_consumed then
				is_input_consumed = component:on_input(action_id, action) or false
			else
				if component.on_input_interrupt then
					component:on_input_interrupt(action_id, action)
				end
			end
		end
	end

	self._is_late_remove_enabled = false
	self:_clear_late_remove()

	return is_input_consumed
end






function M:on_message(message_id, message, sender)
	if message_id == const.MSG_LAYOUT_CHANGED then
		
		local components = self.components_interest[const.ON_LAYOUT_CHANGE]
		for i = 1, #components do
			components[i]:on_layout_change()
		end
	else
		
		local components = self.components_interest[const.ON_MESSAGE]
		for i = 1, #components do
			components[i]:on_message(message_id, message, sender)
		end
	end
end




function M:on_window_event(window_event)
	if window_event == window.WINDOW_EVENT_FOCUS_LOST then
		local components = self.components_interest[const.ON_FOCUS_LOST]
		for i = 1, #components do
			components[i]:on_focus_lost()
		end
	elseif window_event == window.WINDOW_EVENT_FOCUS_GAINED then
		local components = self.components_interest[const.ON_FOCUS_GAINED]
		for i = 1, #components do
			components[i]:on_focus_gained()
		end
	elseif window_event == window.WINDOW_EVENT_RESIZED then
		local components = self.components_interest[const.ON_WINDOW_RESIZED]
		for i = 1, #components do
			components[i]:on_window_resized()
		end
	end
end





function M:on_language_change()
	local components = self.components_interest[const.ON_LANGUAGE_CHANGE]
	for i = 1, #components do
		components[i]:on_language_change()
	end
end







function M:set_whitelist(whitelist_components)
	if whitelist_components and whitelist_components._component then
		whitelist_components = { whitelist_components }
	end

	for i = 1, #whitelist_components do
		helper.add_array(whitelist_components, whitelist_components[i]:get_childrens())
	end

	self._input_whitelist = whitelist_components

	return self
end







function M:set_blacklist(blacklist_components)
	if blacklist_components and blacklist_components._component then
		blacklist_components = { blacklist_components }
	end

	for i = 1, #blacklist_components do
		helper.add_array(blacklist_components, blacklist_components[i]:get_childrens())
	end

	self._input_blacklist = blacklist_components

	return self
end




function M:_clear_late_remove()
	if #self._late_remove == 0 then
		return
	end

	for i = 1, #self._late_remove do
		self:remove(self._late_remove[i])
	end
	self._late_remove = {}
end









function M:new_widget(widget, template, nodes, ...)
	local instance = create_widget(self, widget)

	instance.druid = instance:get_druid(template, nodes)

	if instance.init then
		instance:init(...)
	end
	if instance.on_late_init or (not self.input_inited and instance.on_input) then
		schedule_late_init(self)
	end

	return instance
end


local button = require("druid.base.button")






function M:new_button(node, callback, params, anim_node)
	return self:new(button, node, callback, params, anim_node)
end


local blocker = require("druid.base.blocker")



function M:new_blocker(node)
	return self:new(blocker, node)
end


local back_handler = require("druid.base.back_handler")




function M:new_back_handler(callback, params)
	return self:new(back_handler, callback, params)
end


local hover = require("druid.base.hover")





function M:new_hover(node, on_hover_callback, on_mouse_hover_callback)
	return self:new(hover, node, on_hover_callback, on_mouse_hover_callback)
end


local text = require("druid.base.text")





function M:new_text(node, value, adjust_type)
	return self:new(text, node, value, adjust_type)
end


local static_grid = require("druid.base.static_grid")





function M:new_grid(parent_node, item, in_row)
	return self:new(static_grid, parent_node, item, in_row)
end


local scroll = require("druid.base.scroll")




function M:new_scroll(view_node, content_node)
	return self:new(scroll, view_node, content_node)
end


local drag = require("druid.base.drag")




function M:new_drag(node, on_drag_callback)
	return self:new(drag, node, on_drag_callback)
end


local swipe = require("druid.extended.swipe")




function M:new_swipe(node, on_swipe_callback)
	return self:new(swipe, node, on_swipe_callback)
end


local lang_text = require("druid.extended.lang_text")





function M:new_lang_text(node, locale_id, adjust_type)
	return self:new(lang_text, node, locale_id, adjust_type)
end


local slider = require("druid.extended.slider")





function M:new_slider(pin_node, end_pos, callback)
	return self:new(slider, pin_node, end_pos, callback)
end


local input = require("druid.extended.input")





function M:new_input(click_node, text_node, keyboard_type)
	return self:new(input, click_node, text_node, keyboard_type)
end


local data_list = require("druid.extended.data_list")





function M:new_data_list(druid_scroll, druid_grid, create_function)
	return self:new(data_list, druid_scroll, druid_grid, create_function)
end


local timer_component = require("druid.extended.timer")






function M:new_timer(node, seconds_from, seconds_to, callback)
	return self:new(timer_component, node, seconds_from, seconds_to, callback)
end


local progress = require("druid.extended.progress")





function M:new_progress(node, key, init_value)
	return self:new(progress, node, key, init_value)
end


local layout = require("druid.extended.layout")




function M:new_layout(node, mode)
	return self:new(layout, node, mode)
end


local container = require("druid.extended.container")





function M:new_container(node, mode, callback)
	return self:new(container, node, mode, callback)
end


local hotkey = require("druid.extended.hotkey")





function M:new_hotkey(keys_array, callback, callback_argument)
	return self:new(hotkey, keys_array, callback, callback_argument)
end


local rich_text = require("druid.custom.rich_text.rich_text")




function M:new_rich_text(text_node, value)
	return self:new(rich_text, text_node, value)
end


local rich_input = require("druid.custom.rich_input.rich_input")





function M:new_rich_input(template, nodes)
	return self:new(rich_input, template, nodes)
end


return M
