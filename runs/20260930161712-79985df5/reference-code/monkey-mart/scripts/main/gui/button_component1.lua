

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT		= "root",
	ICON		= "icon",
	CHECKBOX	= "galka",
	BUTTON		= "button",
	ICON_COIN	= "icon_coin",
	TEXT_COIN	= "text_coin"
}




function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root = self:get_node(SCHEME.ROOT)
	self.checkbox = self:get_node(SCHEME.CHECKBOX)
	self.icon = self:get_node(SCHEME.ICON)
	self.btn_buy = self:get_node(SCHEME.BUTTON)
	self.btn_icon = self:get_node(SCHEME.ICON_COIN)
	self.btn_text = self:get_node(SCHEME.TEXT_COIN)

	self.button = self.druid:new_button(self.btn_buy, self._on_click)

	self.on_click = event.create()
end


function ButtonComponent:set_data(data)
	self._data = data
	self:set_checked(self._data.is_checked)

	local num_icon = self._data.view

	gui.play_flipbook(self.icon, 'hat'..num_icon)
	gui.set_enabled(self.btn_icon, true)

	if data.type == 'coins1' then
		gui.play_flipbook(self.btn_icon, 'cash1')
		gui.set_position(self.btn_icon, vmath.vector3(-35,-1,0))
	elseif data.type == 'coinsH' then
		gui.play_flipbook(self.btn_icon, 'cashH')
		gui.set_position(self.btn_icon, vmath.vector3(-33,-1,0))
	elseif data.type == 'coinsC' then
		gui.play_flipbook(self.btn_icon, 'cashC')
		gui.set_position(self.btn_icon, vmath.vector3(-33,-1,0))
	elseif data.type == 'free' then
		gui.set_enabled(self.btn_icon, false)
	elseif data.type == 'ads' then
		gui.play_flipbook(self.btn_icon, 'ads')
		gui.set_position(self.btn_icon, vmath.vector3(-30,1,0))
	elseif data.type == 'gems' then
		gui.play_flipbook(self.btn_icon, 'gem1')
		gui.set_position(self.btn_icon, vmath.vector3(-30,-1,0))
	elseif data.type == 'quest' then
		

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
	if self._data.is_have then
		if self._data.is_checked then
			gui.set_text(self.btn_text, utf8.upper(translate("SELECTED")))
			gui.play_flipbook(self.btn_buy, 'btn_selected')
		else
			gui.set_text(self.btn_text, utf8.upper(translate("SELECT")))
			gui.play_flipbook(self.btn_buy, 'btn_buy')
		end

		utils.updateTextWidth(self.btn_text, 125, 1)
		gui.set_position(self.btn_text, vmath.vector3(0,2,0))

		gui.set_enabled(self.btn_icon, false)
		gui.set_enabled(self.checkbox, self._data.is_checked)

	else
		gui.set_position(self.btn_text, vmath.vector3(25,2,0))
		gui.set_enabled(self.btn_icon, true)
		gui.set_scale(self.btn_icon, vmath.vector3(1.0, 1.0, 1.0))

		if (self._data.type == 'gems') or (self._data.type == 'coinsH') or (self._data.type == 'coinsC') then
			gui.set_text(self.btn_text, self._data.price)

			self.button:set_enabled(true)

			local coins_value = coinmanager.get_balance(self._data.type)
			local price = self._data.price

			if type(price) == "number" then
				if (coins_value < price) then
					self.button:set_enabled(false)
				end

				if (self._data.type == 'coinsH') or (self._data.type == 'coinsC') then
					local scaleCash = vmath.vector3(0.8, 0.8, 0.8)
					gui.set_scale(self.btn_icon, scaleCash)
				end
			end

		elseif self._data.type == 'free' then
			gui.set_position(self.btn_text, vmath.vector3(0,2,0))
			gui.set_text(self.btn_text, utf8.upper(translate("FREE")))
			utils.updateTextWidth(self.btn_text, 125, 1)
			gui.set_enabled(self.btn_icon, false)

		elseif self._data.type == 'ads' then
			gui.set_text(self.btn_text, self._data.ads_shown..'/'..self._data.price)

			if global.isAdBlocked then
				self.button:set_enabled(false)
			end

		elseif self._data.type == 'quest' then
			gui.set_text(self.btn_text, "?")
			gui.set_enabled(self.btn_icon, false)
			gui.set_position(self.btn_text, vmath.vector3(0,2,0))

		elseif self._data.type == 'iap' then
			gui.set_enabled(self.btn_icon, false)
			gui.set_position(self.btn_text, vmath.vector3(0,2,0))

			if iap then
				local data = nil
				local id = nil

				if (self._data.num == 26) then
					id = 'com.tinydobbins.monkeymart.hat_fruit1'
					if iap_manager.available_products[id] then
						data = iap_manager.available_products[id]
						gui.set_text(self.btn_text, data.price_string)
					end
				end
				if (self._data.num == 27) then
					id = 'com.tinydobbins.monkeymart.hat_fruit2'
					if iap_manager.available_products[id] then
						data = iap_manager.available_products[id]
						gui.set_text(self.btn_text, data.price_string)
					end
				end
				if (self._data.num == 28) then
					id = 'com.tinydobbins.monkeymart.hat_indian'
					if iap_manager.available_products[id] then
						data = iap_manager.available_products[id]
						gui.set_text(self.btn_text, data.price_string)
					end
				end
			else
				gui.set_text(self.btn_text, "0,99 $")
			end

		end

	end

	gui.set_scale(self.icon, vmath.vector3(1.0, 1.0, 1.0))

	if (self._data.num == 26) or
	(self._data.num == 27) or
	(self._data.num == 28)
	then
		gui.set_scale(self.icon, vmath.vector3(0.85, 0.85, 0.85))
	end

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
