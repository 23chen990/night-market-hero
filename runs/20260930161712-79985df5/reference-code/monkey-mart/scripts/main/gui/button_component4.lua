

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT			= "root",
	BODY			= "body",
	ICON			= "icon",
	ICON			= "icon",
	ICON_ADD1		= "icon_add1",
	ICON_ADD2		= "icon_add2",
	ICON_LOAD		= "icon_load",
	TEXT_TITLE		= "text_title",
	BUTTON			= "button",
	ICON_COIN		= "icon_coin",
	DISCOUNT		= "discount",
	TEXT_BUTTON		= "text_button",
	TEXT_ADDITION	= "text_dop",
	TEXT_DISCOUNT	= "text_discount"
}



function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root			= self:get_node(SCHEME.ROOT)
	self.icon_body		= self:get_node(SCHEME.BODY)
	self.icon			= self:get_node(SCHEME.ICON)
	self.icon_add1		= self:get_node(SCHEME.ICON_ADD1)
	self.icon_add2		= self:get_node(SCHEME.ICON_ADD2)
	self.icon_load		= self:get_node(SCHEME.ICON_LOAD)
	self.icon_coin		= self:get_node(SCHEME.ICON_COIN)
	self.discount		= self:get_node(SCHEME.DISCOUNT)
	self.text_title		= self:get_node(SCHEME.TEXT_TITLE)
	self.btn_buy		= self:get_node(SCHEME.BUTTON)
	self.btn_text		= self:get_node(SCHEME.TEXT_BUTTON)
	self.text_add		= self:get_node(SCHEME.TEXT_ADDITION)
	self.text_discount	= self:get_node(SCHEME.TEXT_DISCOUNT)

	self.button = self.druid:new_button(self.btn_buy, self._on_click)

	self.on_click = event.create()

end

function ButtonComponent:set_data(data)
	self._data = data

end

function ButtonComponent:get_data()
	return self._data
end

function ButtonComponent:update_btn()
	local data = self._data
	
	gui.play_flipbook(self.icon, data.icon)
	gui.set_position(self.icon, vmath.vector3(0, 0, 0))

	gui.set_text(self.text_title, data.description)

	if data.price_string then
		gui.set_enabled(self.btn_text, true)
		gui.set_text(self.btn_text, data.price_string)
	end

	gui.set_enabled(self.icon_load, false)
	gui.set_enabled(self.icon_add1, false)
	gui.set_enabled(self.icon_add2, false)
	gui.set_enabled(self.text_add, false)

	if data.frame_body then
		gui.play_flipbook(self.icon_body, data.frame_body)
	end

	if data.icon_gem then
		gui.set_enabled(self.icon_coin, true)
		gui.set_position(self.btn_text, vmath.vector3(15, 2, 0))
	else
		gui.set_enabled(self.icon_coin, false)
		gui.set_position(self.btn_text, vmath.vector3(0, 2, 0))
	end

	if data.discount then
		gui.set_enabled(self.text_discount, true)
		gui.set_enabled(self.discount, true)
		local disount_string = "+"..data.discount.."%"
		gui.set_text(self.text_discount, disount_string)
	else
		gui.set_enabled(self.text_discount, false)
		gui.set_enabled(self.discount, false)
	end

	if data.offset then
		gui.set_position(self.icon, data.offset)
	end

	if data.amount then
		gui.set_text(self.text_title, data.amount)
	end

	if data.additional then
		gui.set_enabled(self.text_add, true)
		gui.set_text(self.text_add, data.additional)
		gui.set_position(self.text_add, vmath.vector3(30, 35, 0))
	end

	utils.updateTextWidth(self.text_title, 125, 1)

	if (data.type == "item_gem") then
		local gems_to_coins = datamanager.get_gems_to_coins()
		data.amount = gems_to_coins[data.value]
		gui.set_text(self.text_title, data.amount)

		if (data.value == 2) then
			gui.set_enabled(self.icon_add1, true)
			gui.set_enabled(self.icon_add2, true)
			gui.play_flipbook(self.icon_add1, 'pig_bundle2')
			gui.play_flipbook(self.icon_add2, data.icon_add2)

			gui.set_position(self.icon_add1, vmath.vector3(5, 0-14, 0.01))		
			gui.set_position(self.icon_add2, vmath.vector3(-2, 44-14, 0.02))	
			gui.set_position(self.icon, vmath.vector3(33, -23-14, 0.03))		

		elseif (data.value == 3) then
			gui.set_enabled(self.icon_add1, true)
			gui.play_flipbook(self.icon_add1, 'case_bundle3')

			gui.set_position(self.icon_add1, vmath.vector3(5, -5-5, 0.01))	
			gui.set_position(self.icon, vmath.vector3(-4, -7-5, 0.03))			
		end

		self.button:set_enabled(true)

		local coins_value = coinmanager.get_balance('gems')
		local price = data.price_string

		if type(price) == "number" then
			if (coins_value < price) then
				self.button:set_enabled(false)
			end
		end

	elseif (data.type == 'item') or (data.type == 'item_special') then
		self.button:set_enabled(global.isNetworkConnected)

		if (not global.isNetworkConnected) then
			gui.set_enabled(self.icon_load, true)
			gui.set_enabled(self.btn_text, false)
		end
	end

end

function ButtonComponent:set_enabled(bool)
	self.button:set_enabled(bool)

end

function ButtonComponent:set_click_zone(node)
	self.button:set_click_zone(node)
end

function ButtonComponent:on_remove()
	self.on_click:clear()

end

function ButtonComponent:_on_click()
	self.on_click:trigger(self)
end


return ButtonComponent
