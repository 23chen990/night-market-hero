

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT			= "root",
	BUTTON			= "button",
	ICON_MART		= "icon_mart",
	ICON_LOCK		= "icon_lock",
	TEXT_TITLE		= "text_title",
	TEXT_PROGRESS	= "text_progress",
	PROGRESS_BACK	= "progress_back",
	PROGRESS_MASK	= "progress_mask"
}




function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root			= self:get_node(SCHEME.ROOT)
	self.button			= self:get_node(SCHEME.BUTTON)
	self.icon_mart		= self:get_node(SCHEME.ICON_MART)
	self.icon_lock		= self:get_node(SCHEME.ICON_LOCK)
	self.text_title		= self:get_node(SCHEME.TEXT_TITLE)
	self.text_progress	= self:get_node(SCHEME.TEXT_PROGRESS)
	self.progress_back	= self:get_node(SCHEME.PROGRESS_BACK)
	self.progress_mask	= self:get_node(SCHEME.PROGRESS_MASK)

	self.button1 = self.druid:new_button(self.button, self._on_click1)

	self.on_click1 = event.create()

	self.maxWidth = 200
	self.unlocked_mart = 1

end


function ButtonComponent:set_data(data)
	self._data = data

	local icon_frame = data.icon
	local offset = self._data.offset

	gui.play_flipbook(self.icon_mart, icon_frame)

	local s = 0.75
	gui.set_scale(self.icon_mart, vmath.vector3(s, s, s))

	local posIcon = vmath.vector3(-15 + offset.x, 47 + offset.y, 0)
	gui.set_position(self.icon_mart, posIcon)

	self:update_btn()

end


function ButtonComponent:get_data()
	return self._data
end

function ButtonComponent:set_enabled(state)
	self.button1.disabled = not state

end

function ButtonComponent:set_checked(state)
	self._data.is_checked = state
	gui.set_enabled(self.checkbox, state)
end

function ButtonComponent:set_buy(state)
	self._data.is_have = state

end

function ButtonComponent:update_btn()
	local num = self._data.value

	for i=2,global.maxMarket do
		if (global["numSale"..i]) and (global["numSale"..i] > 1) then
			self.unlocked_mart = i
		end
	end

	if (num > self.unlocked_mart) then
		self.button1:set_enabled(false)
	end

	gui.set_text(self.text_title, num)

	gui.set_enabled(self.icon_mart, false)
	gui.set_enabled(self.icon_lock, false)
	gui.set_enabled(self.text_progress, false)
	gui.set_enabled(self.progress_back, false)
	gui.set_enabled(self.progress_mask, false)

	if (global.isDebug) and (global.isUnlockPlaces) then
		self.button1:set_enabled(true)
		gui.set_enabled(self.icon_mart, true)
		return
	end

	if (num <= self.unlocked_mart) then
		gui.set_enabled(self.icon_mart, true)

	else
		gui.set_enabled(self.icon_lock, true)

		if (num > 1) then
			self:updateLockProgress(num)
		end

		
		
		
		
		
		
		
		
		
		
	end

	if (num == global.numMarket) then
		self.button1.disabled = true
	end

end

function ButtonComponent:updateLockProgress(vNum)
	local num1 = vNum - 1
	local num2 = vNum - 2
	local numSalePrev = 1
	local maxSalePrev = 1
	local numSale2prev = 2
	local maxSale2prev = 2

	numSalePrev = global['numSale'..num1]
	maxSalePrev = global['maxSale'..num1]

	if (num2 > 0) then
		numSale2prev = global['numSale'..num2]
		maxSale2prev = global['maxSale'..num2]
	end

	if (numSalePrev == maxSalePrev) then
		gui.set_enabled(self.icon_mart, true)
		gui.set_enabled(self.icon_lock, false)
		self.button1:set_enabled(true)

	else
		if (vNum > 1) and (numSale2prev == maxSale2prev) and (numSalePrev > 1) then
			gui.set_enabled(self.icon_lock, true)
			gui.set_enabled(self.text_progress, true)
			gui.set_enabled(self.progress_back, true)
			gui.set_enabled(self.progress_mask, true)

			local ratio = numSalePrev/maxSalePrev
			local ratioText = math.floor(100 * ratio) .. '%'

			gui.set_text(self.text_progress, ratioText)
			self:updateProgress(utils.roundDecimal(ratio, 2))
		end
	end

end

function ButtonComponent:updateProgress(vRatio)
	local sizeProgress = vmath.vector3(self.maxWidth * vRatio, 34, 0)
	gui.set_size(self.progress_mask, sizeProgress)

end

function ButtonComponent:set_click_zone(node)
	self.button1:set_click_zone(node)
	
end


function ButtonComponent:on_remove()
	self.on_click1:clear()
	
end


function ButtonComponent:_on_click1()
	self.on_click1:trigger(self)
end

function ButtonComponent:_on_click2()
	
end


return ButtonComponent
