local IS_DEBUG = sys.get_engine_info().is_debug
local MEMORY_THRESHOLD_WARNING = IS_DEBUG and sys.get_config_int("event.memory_threshold_warning", 0) or 0



local USE_XPCALL = sys.get_config_int("event.use_xpcall", 0) == 1















local M = {}


local EVENT_METATABLE
local MEMORY_BEFORE_VALUE


local set_context = event_context_manager.set
local get_context = event_context_manager.get
local pcall = pcall
local table_insert = table.insert
local table_remove = table.remove


local EMPTY_FUNCTION = function(_, message, context) end


local empty_logger = {
	trace = EMPTY_FUNCTION,
	debug = EMPTY_FUNCTION,
	info = EMPTY_FUNCTION,
	warn = EMPTY_FUNCTION,
	error = EMPTY_FUNCTION,
}


local logger = {
	trace = EMPTY_FUNCTION,
	debug = EMPTY_FUNCTION,
	info = EMPTY_FUNCTION,
	warn = function(_, message)
		pprint("WARN:", message)
	end,
	error = function(_, message)
		pprint("ERROR:", message)
	end,
}





function M.set_logger(logger_instance)
	logger = logger_instance or empty_logger
end






function M.set_memory_threshold(value)
	if not IS_DEBUG then
		return
	end
	MEMORY_THRESHOLD_WARNING = value
end










function M.create(callback, callback_context)
	local instance = setmetatable({}, EVENT_METATABLE)

	if callback then
		instance:subscribe(callback, callback_context)
	end

	return instance
end


















function M:subscribe(callback, callback_context)
	assert(callback, "A function must be passed to subscribe to an event")

	
	if type(callback) == "table" and callback.trigger then
		return self:subscribe(callback.trigger, callback)
	end

	
	if self:is_subscribed(callback, callback_context) then
		logger:warn("Callback is already subscribed to the event. Callback will not be subscribed again.")
		return false
	end

	if MEMORY_THRESHOLD_WARNING > 0 then
		self._mapping = self._mapping or {}
		local caller_info = debug.getinfo(2)
		self._mapping[callback] = caller_info.short_src .. ":" .. caller_info.currentline
	end

	table_insert(self, { callback, callback_context, get_context() })
	return true
end









function M:unsubscribe(callback, callback_context)
	assert(callback, "A function must be passed to subscribe to an event")

	
	if type(callback) == "table" and callback.trigger then
		return self:unsubscribe(callback.trigger, callback)
	end

	

	local is_removed = false
	for index = #self, 1, -1 do
		local cb = self[index]
		if cb[1] == callback and (not callback_context or cb[2] == callback_context) then
			table_remove(self, index)
			is_removed = true
		end
	end

	return is_removed
end









function M:is_subscribed(callback, callback_context)
	if #self == 0 then
		return false, nil
	end

	
	if type(callback) == "table" and callback.trigger then
		return self:is_subscribed(callback.trigger, callback)
	end

	

	for index = 1, #self do
		local cb = self[index]
		if cb[1] == callback and cb[2] == callback_context then
			return true, index
		end
	end

	return false, nil
end





local function event_error_handler(error_message)
	return debug.traceback(error_message, 2)
end












function M:trigger(...)
	if #self == 0 then
		return
	end

	local result = nil
	local current_script_context = get_context()

	for index = 1, #self do
		local callback = self[index]
		local event_callback = callback[1]
		local event_callback_context = callback[2]
		local event_script_context = callback[3]

		
		if current_script_context ~= event_script_context then
			set_context(event_script_context)
		end

		
		if MEMORY_THRESHOLD_WARNING > 0 then
			MEMORY_BEFORE_VALUE = collectgarbage("count")
		end

		
		local ok, result_or_error
		if event_callback_context then
			if not USE_XPCALL then
				ok, result_or_error = pcall(event_callback, event_callback_context, ...)
			else
				
				local args = { event_callback_context }

				
				
				
				local n = select("#", ...)
				for i = 1, n do
					args[i+1] = select(i, ...)
				end

				ok, result_or_error = xpcall(function()
					return event_callback(unpack(args))
				end, event_error_handler)
			end
		else
			if not USE_XPCALL then
				ok, result_or_error = pcall(event_callback, ...)
			else
				
				local args = {}
				local n = select("#", ...)

				
				for i = 1, n do
					args[i] = select(i, ...)
				end

				ok, result_or_error = xpcall(function()
					return event_callback(unpack(args))
				end, event_error_handler)
			end
		end

		
		if MEMORY_THRESHOLD_WARNING > 0 then
			local memory_after = collectgarbage("count")
			if memory_after - MEMORY_BEFORE_VALUE > MEMORY_THRESHOLD_WARNING then
				local caller_info = debug.getinfo(2)
				logger:warn("Detected huge memory allocation in event", {
					event = self._mapping and self._mapping[event_callback],
					trigger = caller_info.short_src .. ":" .. caller_info.currentline,
					memory = memory_after - MEMORY_BEFORE_VALUE,
				})
			end
		end

		
		if current_script_context ~= event_script_context then
			set_context(current_script_context)
		end

		
		if not ok then
			local caller_info = debug.getinfo(2)
			local place = caller_info.short_src .. ":" .. caller_info.currentline
			logger:error("Error in trigger event: " .. place, result_or_error)
			logger:error(debug.traceback(result_or_error, 2))
		end

		result = result_or_error
	end

	return result
end





function M:is_empty()
	return #self == 0
end




function M:clear()
	for index = #self, 1, -1 do
		self[index] = nil
	end
end


EVENT_METATABLE = {
	__index = M,
	__call = M.trigger,
}

return M
