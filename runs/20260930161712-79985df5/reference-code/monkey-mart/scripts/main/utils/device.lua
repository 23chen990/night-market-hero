



















local device = {}

local HTML5_TRUE = "true"

local change_orientation_list = {}



local USER_AGENT = string.lower(html5 and sys.get_sys_info({ignore_secure = true}).user_agent or sys.get_sys_info({ignore_secure = true}).system_name)


local TELEVISION = {
	'googletv', 'viera', 'smarttv', 'internet.tv', 'netcast', 'nettv', 'appletv', 'boxee', 'kylo', 'roku', 'dlnadoc',
	'pov_tv', 'hbbtv', 'ce-html'
}





local function includes(haystack, needle)
	return string.find(haystack, needle, 1, true) ~= nil
end


local function find(needle)
	return includes(USER_AGENT, needle)
end

local function find_match(arr)
	for _, v in ipairs(arr) do
		if device[v]() then
			return v
		end
	end
	return 'unknown'
end




function device.macos()
	return find('mac')
end

function device.ios()
	return device.iphone() or device.ipod() or device.ipad()
end

function device.iphone()
	return not device.windows() and find('iphone')
end

function device.ipod()
	return find('ipod')
end

function device.ipad()
	local ipados13_up = html5 and (html5.run("navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1") == HTML5_TRUE) or false
	return find('ipad') or ipados13_up
end

function device.android()
	return not device.windows() and find('android')
end

function device.android_phone()
	return device.android() and find('mobile')
end

function device.android_tablet()
	return device.android() and not find('mobile')
end

function device.blackberry()
	return find('blackberry') or find('bb10')
end

function device.blackberry_phone()
	return device.blackberry() and not find('tablet')
end

function device.blackberry_tablet()
	return device.blackberry() and find('tablet')
end

function device.windows()
	return find('windows')
end

function device.windows_phone()
	return device.windows() and find('phone')
end

function device.windows_tablet()
	return device.windows() and (find('touch') and not device.windows_phone())
end

function device.fxos()
	return (find('(mobile') or find('(tablet')) and find(' rv:')
end

function device.fxos_phone()
	return device.fxos() and find('mobile')
end

function device.fxos_tablet()
	return device.fxos() and find('tablet')
end

function device.meego()
	return find('meego')
end

function device.mobile()
	return (device.android_phone() or device.iphone() or device.ipod() or device.windows_phone() or
	device.blackberry_phone() or device.fxos_phone() or device.meego())
end

function device.tablet()
	return (device.ipad() or device.android_tablet() or device.blackberry_tablet() or device.windows_tablet() or
	device.fxos_tablet())
end

function device.desktop()
	return not device.tablet() and not device.mobile()
end

function device.television()
	local i = 1
	while i < #TELEVISION do
		if find(TELEVISION[i]) then
			return true
		end
		i = i + 1
	end
	return false
end

function device.portrait()
	if html5 then
		if html5.run("screen.orientation && Object.prototype.hasOwnProperty.call(window, 'onorientationchange')") == HTML5_TRUE then
			return includes(html5.run("screen.orientation.type"), "portrait")
		end
		if device.ios() and html5.run("Object.prototype.hasOwnProperty.call(window, 'orientation')") == HTML5_TRUE then
			return html5.run("Math.abs(window.orientation) !== 90") == HTML5_TRUE
		end
	end
	local width, height = window.get_size()
	return height / width > 1
end

function device.landscape()
	if html5 then
		if html5.run("screen.orientation && Object.prototype.hasOwnProperty.call(window, 'onorientationchange')") == HTML5_TRUE then
			return includes(html5.run("screen.orientation.type"), "landscape")
		end
		if device.ios() and html5.run("Object.prototype.hasOwnProperty.call(window, 'orientation')") == HTML5_TRUE then
			return html5.run("Math.abs(window.orientation) === 90") == HTML5_TRUE
		end
	end
	local width, height = window.get_size()
	return height / width <= 1
end




local function set_orientation_cache()
	device.orientation = find_match({'portrait', 'landscape'})
end

local function walk_on_change_orientation_list(new_orientation)
	for _, f in pairs(change_orientation_list) do
		f(new_orientation)
	end
end


function device.handle_orientation()
	local new_value = find_match({'portrait', 'landscape'})
	if device.orientation ~= new_value then
		walk_on_change_orientation_list(new_value)
		device.orientation = new_value
	end
end

function device.on_change_orientation(cb)
	if type(cb) == 'function' then
		table.insert(change_orientation_list, cb)
	end
end




device.type = find_match({'mobile', 'tablet', 'desktop'})
device.os = find_match({
	'ios', 'iphone', 'ipad', 'ipod', 'android', 'blackberry', 'macos', 'windows', 'fxos', 'meego', 'television'
})

set_orientation_cache()

return device