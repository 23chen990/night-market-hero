

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT			= "root",
	ICON			= "icon",
	BUTTON1			= "button1",
	BUTTON2			= "button2",
	BUTTON3			= "button3",
	ICON_ITEM1		= "iconFood1",
	ICON_ITEM2		= "iconFood2",
	ICON_ITEM3		= "iconFood3",
	TEXT_ITEM		= "text_item",
	TEXT_UPGRADE1	= "text_upgrade1",
	TEXT_UPGRADE2	= "text_upgrade2",
	TEXT_UPGRADE3	= "text_upgrade3",
	TEXT_PRICE1		= "text_coin1",
	TEXT_PRICE2		= "text_coin2",
	TEXT_PRICE3		= "text_coin3",
	ICON_COIN1		= "icon_coin1",
	ICON_COIN2		= "icon_coin2",
	ICON_COIN3		= "icon_coin3"
}




function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root = self:get_node(SCHEME.ROOT)
	self.icon = self:get_node(SCHEME.ICON)
	self.icon_item1 = self:get_node(SCHEME.ICON_ITEM1)
	self.icon_item2 = self:get_node(SCHEME.ICON_ITEM2)
	self.icon_item3 = self:get_node(SCHEME.ICON_ITEM3)
	self.btn_buy1 = self:get_node(SCHEME.BUTTON1)
	self.btn_buy2 = self:get_node(SCHEME.BUTTON2)
	self.btn_buy3 = self:get_node(SCHEME.BUTTON3)
	self.text_item = self:get_node(SCHEME.TEXT_ITEM)
	self.text_upgrade1 = self:get_node(SCHEME.TEXT_UPGRADE1)
	self.text_upgrade2 = self:get_node(SCHEME.TEXT_UPGRADE2)
	self.text_upgrade3 = self:get_node(SCHEME.TEXT_UPGRADE3)
	self.text_price1 = self:get_node(SCHEME.TEXT_PRICE1)
	self.text_price2 = self:get_node(SCHEME.TEXT_PRICE2)
	self.text_price3 = self:get_node(SCHEME.TEXT_PRICE3)
	self.icon_coin1 = self:get_node(SCHEME.ICON_COIN1)
	self.icon_coin2 = self:get_node(SCHEME.ICON_COIN2)
	self.icon_coin3 = self:get_node(SCHEME.ICON_COIN3)

	self.button1 = self.druid:new_button(self.btn_buy1, self._on_click1)
	self.button2 = self.druid:new_button(self.btn_buy2, self._on_click2)
	self.button3 = self.druid:new_button(self.btn_buy3, self._on_click3)

	self.on_click1 = event.create()
	self.on_click2 = event.create()
	self.on_click3 = event.create()
end


function ButtonComponent:set_data(data)
	self._data = data

	local num = data.value

	gui.play_flipbook(self.icon, data.icon)

	if num == 1 then	
		gui.set_enabled(self.btn_buy1, false)
		gui.set_enabled(self.text_upgrade1, false)
		gui.set_enabled(self.btn_buy3, false)
		gui.set_enabled(self.text_upgrade3, false)

		gui.set_position(self.btn_buy2, vmath.vector3(185,0,0))

		gui.set_position(self.text_upgrade2, vmath.vector3(95,0,0))
	end

	if (data.icon1) and (data.icon2) and (not data.icon3) then
		gui.set_position(self.icon_item1, vmath.vector3(-240,35,0))
		gui.set_position(self.icon_item2, vmath.vector3(-240,-20,0))
	end

	if data.textId == 'MANAGER' then
		gui.set_enabled(self.btn_buy1, false)
		gui.set_enabled(self.text_upgrade1, false)
		gui.set_enabled(self.btn_buy2, false)
		gui.set_enabled(self.text_upgrade2, false)

		gui.set_position(self.btn_buy3, vmath.vector3(185,0,0))

		gui.set_position(self.text_upgrade3, vmath.vector3(95,0,0))

	end

	if data.textId == 'DELIVERY_CAR' then
		gui.set_enabled(self.btn_buy1, false)
		gui.set_enabled(self.text_upgrade1, false)

		gui.set_position(self.btn_buy2, vmath.vector3(185,56-28,0))
		gui.set_position(self.text_upgrade2, vmath.vector3(95,56-28,0))

		gui.set_position(self.btn_buy3, vmath.vector3(185,-52+28,0))
		gui.set_position(self.text_upgrade3, vmath.vector3(95,-52+28,0))

	end

	if (data.icon1) then
		gui.play_flipbook(self.icon_item1, data.icon1)
	else
		gui.set_enabled(self.icon_item1, false)
	end

	if (data.icon2) then
		gui.play_flipbook(self.icon_item2, data.icon2)
	else
		gui.set_enabled(self.icon_item2, false)
	end

	if (data.icon3) then
		gui.play_flipbook(self.icon_item3, data.icon3)
	else
		gui.set_enabled(self.icon_item3, false)
	end

	self:update_btn()

end


function ButtonComponent:get_data()
	return self._data
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

	local upgrades_level = gameState.dataMart:getUpgradesData('upgrades_level')
	local upgrades_price = gameState.dataMart:getUpgradesData('upgrades_price')
	local upgrades_max = gameState.dataMart:getUpgradesData('upgrades_max')

	if (num == 1) then
		upgrades_level	= global.upgrades_level1
		upgrades_price	= global.upgrades_price1
		upgrades_max	= global.upgrades_max1
	end

	local lvl1 = upgrades_level[num][1]
	local lvl2 = upgrades_level[num][2]
	local lvl3 = upgrades_level[num][3]

	local text_up1 = translate("STAMINA")	.. ' ' .. translate("LVL") .. ' ' .. lvl1
	local text_up2 = translate("STACK")		.. ' ' .. translate("LVL") .. ' ' .. lvl2
	local text_up3 = translate("SPEED")		.. ' ' .. translate("LVL") .. ' ' .. lvl3

	gui.set_text(self.text_upgrade1, text_up1)
	gui.set_text(self.text_upgrade2, text_up2)
	gui.set_text(self.text_upgrade3, text_up3)

	utils.updateTextWidth(self.text_upgrade1, 145, 1)
	utils.updateTextWidth(self.text_upgrade2, 145, 1)
	utils.updateTextWidth(self.text_upgrade3, 145, 1)

	gui.set_text(self.text_item, utf8.upper(translate(self._data.textId)))
	utils.updateTextWidth(self.text_item, 190, 1)

	gui.play_flipbook(self.icon, self._data.icon)

	gui.set_scale(self.icon_coin1, vmath.vector3(1.0, 1.0, 1.0))
	gui.set_scale(self.icon_coin2, vmath.vector3(1.0, 1.0, 1.0))
	gui.set_scale(self.icon_coin3, vmath.vector3(1.0, 1.0, 1.0))

	local scaleCash = vmath.vector3(0.8, 0.8, 0.8)
	local frameNameCash = coinmanager.get_icon_name()

	local text_pr1 = ''

	self.button1:set_enabled(true)
	self.button2:set_enabled(true)
	self.button3:set_enabled(true)

	local coins_value = coinmanager.get_balance()
	local price = 0

	if lvl1 <= upgrades_max[num][1] then
		text_pr1 = upgrades_price[num][1][lvl1]
		gui.play_flipbook(self.btn_buy1, 'btn_buy')

		if text_pr1 == 'ads' then
			gui.play_flipbook(self.icon_coin1, 'ads')
			text_pr1 = translate("FREE")

			if global.isAdBlocked then
				self.button1:set_enabled(false)
			end
		elseif text_pr1 == 'free' then
			text_pr1 = translate("FREE")
			gui.play_flipbook(self.icon_coin1, frameNameCash)
			gui.set_scale(self.icon_coin1, scaleCash)
		else
			gui.play_flipbook(self.icon_coin1, frameNameCash)
			gui.set_scale(self.icon_coin1, scaleCash)
		end

		price = text_pr1

		if type(price) == "number" then
			if (coins_value < price) then
				self.button1:set_enabled(false)
			end
		end

	else
		text_pr1 = translate("MAX")
		gui.play_flipbook(self.icon_coin1, 'icon_max')
		gui.play_flipbook(self.btn_buy1, 'btn_insolvent')

		self.button1:set_enabled(false)
	end
	if lvl2 <= upgrades_max[num][2] then
		text_pr2 = upgrades_price[num][2][lvl2]
		gui.play_flipbook(self.btn_buy2, 'btn_buy')

		if text_pr2 == 'ads' then
			gui.play_flipbook(self.icon_coin2, 'ads')
			text_pr2 = translate("FREE")

			if global.isAdBlocked then
				self.button2:set_enabled(false)
			end
		elseif text_pr2 == 'free' then
			text_pr2 = translate("FREE")
			gui.play_flipbook(self.icon_coin2, frameNameCash)
			gui.set_scale(self.icon_coin2, scaleCash)
		else
			gui.play_flipbook(self.icon_coin2, frameNameCash)
			gui.set_scale(self.icon_coin2, scaleCash)
		end

		price = text_pr2

		if type(price) == "number" then
			if (coins_value < price) then
				self.button2:set_enabled(false)
			end
		end

	else
		text_pr2 = translate("MAX")
		gui.play_flipbook(self.icon_coin2, 'icon_max')
		gui.play_flipbook(self.btn_buy2, 'btn_insolvent')

		self.button2:set_enabled(false)
	end
	if lvl3 <= upgrades_max[num][3] then
		text_pr3 = upgrades_price[num][3][lvl3]
		gui.play_flipbook(self.btn_buy3, 'btn_buy')

		if text_pr3 == 'ads' then
			gui.play_flipbook(self.icon_coin3, 'ads')
			text_pr3 = translate("FREE")

			if global.isAdBlocked then
				self.button3:set_enabled(false)
			end
		elseif text_pr3 == 'free' then
			text_pr3 = translate("FREE")
			gui.play_flipbook(self.icon_coin3, frameNameCash)
			gui.set_scale(self.icon_coin3, scaleCash)
		else
			gui.play_flipbook(self.icon_coin3, frameNameCash)
			gui.set_scale(self.icon_coin3, scaleCash)
		end

		price = text_pr3

		if type(price) == "number" then
			if (coins_value < price) then
				self.button3:set_enabled(false)
			end
		end

	else
		text_pr3 = translate("MAX")
		gui.play_flipbook(self.icon_coin3, 'icon_max')
		gui.play_flipbook(self.btn_buy3, 'btn_insolvent')

		self.button3:set_enabled(false)
	end

	gui.set_text(self.text_price1, text_pr1)
	gui.set_text(self.text_price2, text_pr2)
	gui.set_text(self.text_price3, text_pr3)

	utils.updateTextWidth(self.text_price1, 75, 1)
	utils.updateTextWidth(self.text_price2, 75, 1)
	utils.updateTextWidth(self.text_price3, 75, 1)

	local placeId = self._data.placeId

	if (placeId > 0) and (gameState.isGameStarted) then
		local isAvailable = gameState.listPlaceBoxes[placeId].isActive

		if isAvailable then
			gui.set_text(self.text_item, utf8.upper(translate(self._data.textId)))
			utils.updateTextWidth(self.text_item, 190, 1)

			gui.reset_material(self.icon)
			gui.set_layer(self.icon, "image")

		else
			gui.set_material(self.icon, "color_fill")
			gui.set_layer(self.icon, "image_top")

			gui.set_text(self.text_item, '?')
		end

		if (upgrades_max[num][1] > 0) then
			gui.set_enabled(self.btn_buy1, isAvailable)
			gui.set_enabled(self.text_upgrade1, isAvailable)
		end
		if (upgrades_max[num][2] > 0) then
			gui.set_enabled(self.btn_buy2, isAvailable)
			gui.set_enabled(self.text_upgrade2, isAvailable)
		end
		if (upgrades_max[num][3] > 0) then
			gui.set_enabled(self.btn_buy3, isAvailable)
			gui.set_enabled(self.text_upgrade3, isAvailable)
		end

		if (self._data.icon1) then
			gui.set_enabled(self.icon_item1, isAvailable)
		end

		if (self._data.icon2) then
			gui.set_enabled(self.icon_item2, isAvailable)
		end

		if (self._data.icon3) then
			gui.set_enabled(self.icon_item3, isAvailable)
		end
	end

end

function ButtonComponent:set_click_zone(node)
	self.button1:set_click_zone(node)
	self.button2:set_click_zone(node)
	self.button3:set_click_zone(node)
end


function ButtonComponent:on_remove()
	self.on_click1:clear()
	self.on_click2:clear()
	self.on_click3:clear()
end


function ButtonComponent:_on_click1()
	self.on_click1:trigger(self)
end

function ButtonComponent:_on_click2()
	self.on_click2:trigger(self)
end

function ButtonComponent:_on_click3()
	self.on_click3:trigger(self)
end


return ButtonComponent
