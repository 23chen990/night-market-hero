local Event = require("event.event")




local M = {}



M.events = {}









function M.trigger(event_id, ...)
	local event = M.events[event_id]
	if event then
		return event:trigger(...)
	end
end





function M.clear(event_id)
	M.events[event_id] = nil
end




function M.clear_all()
	M.events = {}
end











function M.subscribe(event_id, callback, callback_context)
	M.events[event_id] = M.events[event_id] or Event.create()
	local is_subscribed = M.events[event_id]:subscribe(callback, callback_context)
	return is_subscribed
end












function M.unsubscribe(event_id, callback, callback_context)
	if not M.events[event_id] then
		return false
	end

	return M.events[event_id]:unsubscribe(callback, callback_context)
end










function M.is_subscribed(event_id, callback, callback_context)
	if not M.events[event_id] then
		return false
	end

	return M.events[event_id]:is_subscribed(callback, callback_context)
end






function M.is_empty(event_id)
	if not M.events[event_id] then
		return true
	end

	return M.events[event_id]:is_empty()
end


return M
