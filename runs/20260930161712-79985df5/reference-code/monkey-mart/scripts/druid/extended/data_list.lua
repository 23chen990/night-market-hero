local const = require("druid.const")
local helper = require("druid.helper")
local component = require("druid.component")
local event = require("event.event")



























local M = component.create("data_list")






function M:init(scroll, grid, create_function)
	self.scroll = scroll
	self.grid = grid
	if self.grid.style then
		self.grid.style.IS_DYNAMIC_NODE_POSES = false
	end

	
	self.top_index = 1
	self.last_index = 1
	self.scroll_progress = 0

	self._create_function = create_function
	self._is_use_cache = false
	self._cache = {}
	self._data = {}
	self._data_visual = {}

	self.scroll.on_scroll:subscribe(self._refresh, self)

	self.on_scroll_progress_change = event.create()
	self.on_element_add = event.create()
	self.on_element_remove = event.create()
end



function M:on_remove()
	self:clear()
	self.scroll.on_scroll:unsubscribe(self._refresh, self)
end





function M:set_use_cache(is_use_cache)
	self._is_use_cache = is_use_cache
	return self
end





function M:set_data(data)
	self._data = data or {}
	self:_refresh()

	return self
end




function M:get_data()
	return self._data
end







function M:add(data, index, shift_policy)
	index = index or #self._data + 1
	shift_policy = shift_policy or const.SHIFT.RIGHT

	helper.insert_with_shift(self._data, data, index, shift_policy)
	self:_refresh()

	return self
end






function M:remove(index, shift_policy)
	helper.remove_with_shift(self._data, index, shift_policy)
	self:_refresh()

	return self
end






function M:remove_by_data(data, shift_policy)
	local index = helper.contains(self._data, data)
	if index then
		helper.remove_with_shift(self._data, index, shift_policy)
		self:_refresh()
	end

	return self
end




function M:clear()
	self._data = {}
	self:_refresh()

	return self
end




function M:get_index(data)
	for index, value in pairs(self._data) do
		if value == data then
			return index
		end
	end

	return nil
end




function M:get_created_nodes()
	local nodes = {}

	for index, data in pairs(self._data_visual) do
		nodes[index] = data.node
	end

	return nodes
end




function M:get_created_components()
	local components = {}

	for index, data in pairs(self._data_visual) do
		components[index] = data.component
	end

	return components
end




function M:scroll_to_index(index)
	local pos = self.grid:get_pos(index)
	self.scroll:scroll_to(pos)
end





function M:_add_at(index)
	if self._data_visual[index] then
		self:_remove_at(index)
	end

	local data = self._data[index]
	local node, instance

	
	if #self._cache > 0 and self._is_use_cache then
		local cached = table.remove(self._cache)
		node = cached.node
		instance = cached.component
		gui.set_enabled(node, true)
	else
		
		node, instance = self._create_function(self:get_context(), data, index, self)
	end

	self._data_visual[index] = {
		data = data,
		node = node,
		component = instance,
	}
	self.grid:add(node, index, const.SHIFT.NO_SHIFT)

	self.on_element_add:trigger(self:get_context(), index, node, instance, data)
end





function M:_remove_at(index)
	self.grid:remove(index, const.SHIFT.NO_SHIFT)

	local visual_data = self._data_visual[index]
	local node = visual_data.node
	local instance = visual_data.component
	local data = visual_data.data

	self.on_element_remove:trigger(self:get_context(), index, node, instance, data)

	if self._is_use_cache then
		
		gui.set_enabled(node, false)
		table.insert(self._cache, visual_data)  
	else
		
		gui.delete_node(node)
		if instance then
			instance._meta.druid:remove(instance)
		end
	end

	self._data_visual[index] = nil
end




function M:_refresh()
	self.scroll:set_size(self.grid:get_size_for(#self._data))

	local start_pos = -self.scroll.position 
	local start_index = self.grid:get_index(start_pos)
	start_index = math.max(1, start_index)

	local offset_x = self.scroll.view_size.x
	local offset_y = self.scroll.view_size.y
	local end_pos = vmath.vector3(start_pos.x + offset_x, start_pos.y - offset_y, 0)

	local max_offset_x = (self.grid.in_row - 1) * self.grid.node_size.x
	end_pos.x = math.min(end_pos.x, start_pos.x + max_offset_x)

	if #self._data <= self.grid.in_row then
		end_pos.y = start_pos.y
	end

	local end_index = self.grid:get_index(end_pos)
	end_index = math.min(#self._data, end_index)

	self.top_index = start_index
	self.last_index = end_index

	
	for index, data in pairs(self._data_visual) do
		if index < start_index or index > end_index then
			self:_remove_at(index)
		elseif self._data[index] ~= data.data then
			
			
			self:_remove_at(index)
		end
	end

	
	for index = start_index, end_index do
		if not self._data_visual[index] and self._data[index] then
			self:_add_at(index)
		end
	end
end


return M
