local const = require("druid.const")
local helper = require("druid.helper")




































local M = {}


local uid = 0

function M.create_uid()
	uid = uid + 1
	return uid
end







function M:set_style(druid_style)
	

	self._meta.style = druid_style or {}
	local component_style = self._meta.style[self._component.name] or {}

	if self.on_style_change then
		self:on_style_change(component_style)
	end

	return self
end









function M:set_template(template)
	

	template = template or ""

	local parent = self:get_parent_component()
	if parent then
		local parent_template = parent:get_template()
		if parent_template and #parent_template > 0 then
			if #template > 0 then
				template = "/" .. template
			end
			template = parent_template .. template
		end
	end

	if template ~= "" then
		self._meta.template = template
	else
		self._meta.template = nil
	end

	return self
end




function M:get_template()
	return self._meta.template
end





function M:set_nodes(nodes)
	if type(nodes) == "string" then
		nodes = self:get_node(nodes)
	end
	if type(nodes) == "userdata" then
		nodes = gui.clone_tree(nodes) 
	end

	
	
	
	if nodes then
		for id, node in pairs(nodes) do
			gui.set_id(node, id)
		end
	end

	self._meta.nodes = nodes

	return self
end




function M:get_context()
	return self._meta.context
end





function M:get_node(node_id)
	return helper.get_node(node_id, self:get_template(), self:get_nodes())
end






function M:get_druid(template, nodes)
	local druid_instance = setmetatable({
		_context = self
	}, { __index = self._meta.druid })

	if template then
		self:set_template(template)
	end

	if nodes then
		self:set_nodes(nodes)
	end

	return druid_instance
end




function M:get_name()
	return self._component.name .. M.create_uid()
end




function M:get_parent_name()
	local parent = self:get_parent_component()
	return parent and parent:get_name()
end




function M:get_input_priority()
	return self._component.input_priority
end






function M:set_input_priority(value, is_temporary)
	assert(value)

	local component = self._component

	if component.input_priority == value then
		return self
	end

	component.input_priority = value
	component._is_input_priority_changed = true

	if not is_temporary then
		component.default_input_priority = value
	end

	local children = self:get_childrens()
	for i = 1, #children do
		children[i]:set_input_priority(value, is_temporary)
	end

	return self
end




function M:reset_input_priority()
	self:set_input_priority(self._component.default_input_priority)
	return self
end




function M:get_uid()
	return self._component._uid
end







function M:set_input_enabled(state)
	self._meta.input_enabled = state

	for index = 1, #self._meta.children do
		self._meta.children[index]:set_input_enabled(state)
	end

	return self
end




function M:get_input_enabled()
	return self._meta.input_enabled
end




function M:get_parent_component()
	return self._meta.parent
end









function M:setup_component(druid_instance, context, style, instance_class)
	self._meta = {
		template = "",
		context = context,
		nodes = nil,
		style = nil,
		druid = druid_instance,
		input_enabled = true,
		children = {},
		parent = type(context) ~= "userdata" and context ,
		instance_class = instance_class
	}

	self:set_style(style)
	self:set_template("")

	if self._meta.parent then
		self._meta.parent:__add_child(self)
	end

	return self
end




function M:_is_input_priority_changed()
	return self._component._is_input_priority_changed
end




function M:_reset_input_priority_changed()
	self._component._is_input_priority_changed = false
end




function M:get_nodes()
	local nodes = self._meta.nodes
	local parent = self:get_parent_component()
	if parent then
		nodes = nodes or parent:get_nodes()
	end

	return nodes
end







function M:__add_child(child)
	table.insert(self._meta.children, child)

	return self
end







function M:__remove_child(child)
	for i = #self._meta.children, 1, -1 do
		if self._meta.children[i] == child then
			table.remove(self._meta.children, i)
			return true
		end
	end

	return false
end




function M:get_childrens()
	local childrens = {}

	for i = 1, #self._meta.children do
		local children = self._meta.children[i]

		table.insert(childrens, children)
		helper.add_array(childrens, children:get_childrens())
	end

	return childrens
end






function M.create(name, input_priority)
	local new_class = setmetatable({}, {
		__index = M,
		__call = function(cls, ...)
			local self = setmetatable({
				_component = {
					name = name or "Druid Component",
					input_priority = input_priority or const.PRIORITY_INPUT,
					default_input_priority = input_priority or const.PRIORITY_INPUT,
					_is_input_priority_changed = true, 
					_uid = M.create_uid()
				}
			}, {
				__index = cls
			})
			return self
		end
	})

	return new_class
end


local WIDGET_METATABLE = { __index = M }






function M.create_widget(self, widget_class, context)
	local instance = setmetatable({}, {
		__index = setmetatable(widget_class, WIDGET_METATABLE)
	})

	instance._component = {
		_uid = M.create_uid(),
		name = "Druid Widget",
		input_priority = const.PRIORITY_INPUT,
		default_input_priority = const.PRIORITY_INPUT,
		_is_input_priority_changed = true, 
	}

	
	
	
	instance._meta = setmetatable({}, { __index = {
		druid = self,
		template = "",
		nodes = nil,
		context = context,
		style = nil,
		input_enabled = true,
		children = {},
		parent = type(context) ~= "userdata" and context or nil,
		instance_class = widget_class
	}})

	
	if instance._meta.parent then
		instance._meta.parent:__add_child(instance)
	end

	
	return instance
end


return M
