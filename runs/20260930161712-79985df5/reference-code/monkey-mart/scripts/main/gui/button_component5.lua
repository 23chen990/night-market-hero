

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT			= "root",
	BUTTON1			= "button",
	BUTTON2			= "button_detail",
	ICON1			= "icon1",
	ICON2			= "icon2",
	ICON3			= "icon3",
	ICON4			= "icon4",
	ICON_LOAD		= "icon_load",
	TEXT_TITLE		= "text_title",
	TEXT_ITEM1		= "text_item1",
	TEXT_ITEM2		= "text_item2",
	TEXT_ITEM3		= "text_item3",
	TEXT_ITEM4		= "text_item4",
	TEXT_PLUS1		= "text_plus1",
	TEXT_PLUS2		= "text_plus2",
	TEXT_PLUS3		= "text_plus3",
	TEXT_BUTTON		= "text_button"
}



function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root			= self:get_node(SCHEME.ROOT)
	self.btn_buy		= self:get_node(SCHEME.BUTTON1)
	self.btn_details	= self:get_node(SCHEME.BUTTON2)
	self.icon1			= self:get_node(SCHEME.ICON1)
	self.icon2			= self:get_node(SCHEME.ICON2)
	self.icon3			= self:get_node(SCHEME.ICON3)
	self.icon4			= self:get_node(SCHEME.ICON4)
	self.icon_load		= self:get_node(SCHEME.ICON_LOAD)
	self.text_title		= self:get_node(SCHEME.TEXT_TITLE)
	self.btn_text		= self:get_node(SCHEME.TEXT_BUTTON)
	self.text_item1		= self:get_node(SCHEME.TEXT_ITEM1)
	self.text_item2		= self:get_node(SCHEME.TEXT_ITEM2)
	self.text_item3		= self:get_node(SCHEME.TEXT_ITEM3)
	self.text_item4		= self:get_node(SCHEME.TEXT_ITEM4)
	self.text_plus1		= self:get_node(SCHEME.TEXT_PLUS1)
	self.text_plus2		= self:get_node(SCHEME.TEXT_PLUS2)
	self.text_plus3		= self:get_node(SCHEME.TEXT_PLUS3)

	self.button1 = self.druid:new_button(self.btn_buy, self._on_click1)
	self.button2 = self.druid:new_button(self.btn_details, self._on_click2)

	self.on_click1 = event.create()
	self.on_click2 = event.create()

end

function ButtonComponent:set_data(data)
	self._data = data

	self:update_btn()

end

function ButtonComponent:get_data()
	return self._data
end

function ButtonComponent:update_btn()
	local data = self._data

	gui.play_flipbook(self.icon1, data.icon)

	gui.set_text(self.text_title, data.description)
	utils.updateTextWidth(self.text_title, 270, 1)

	gui.set_enabled(self.icon_load, false)

	if data.price_string then
		gui.set_enabled(self.btn_text, true)
		gui.set_text(self.btn_text, data.price_string)
	end

	if data.value == apimanager.MANAGER_PACK_NOADS_ID then
		gui.set_position(self.icon1, vmath.vector3(-125, -18, 0))
		gui.set_position(self.icon2, vmath.vector3(40, -20, 0))
		gui.set_position(self.icon3, vmath.vector3(160, -8, 0))

		gui.set_position(self.text_item1, vmath.vector3(-125, 45, 0))
		gui.set_position(self.text_item2, vmath.vector3(40, 45, 0))

		gui.set_scale(self.icon2, vmath.vector3(0.8, 0.8, 0.8))

		gui.set_position(self.text_plus1, vmath.vector3(-20, -10, 0))
		gui.set_position(self.text_plus2, vmath.vector3(105, -10, 0))

		gui.set_enabled(self.icon4, false)
		gui.set_enabled(self.text_item3, false)
		gui.set_enabled(self.text_item4, false)
		gui.set_enabled(self.text_plus3, false)

		gui.play_flipbook(self.icon2, 'gem1_bundle2')
		gui.play_flipbook(self.icon3, 'icon_offer_ads')

		gui.set_text(self.text_item1, translate("PERPETUAL"))
		gui.set_text(self.text_item2, global.amount2_iap)

	elseif data.value == apimanager.MANAGER_PACK_ID then
		gui.set_position(self.icon1, vmath.vector3(-125, -18, 0))
		gui.set_position(self.icon2, vmath.vector3(40, -20, 0))

		gui.set_position(self.text_item1, vmath.vector3(-125, 45, 0))
		gui.set_position(self.text_item2, vmath.vector3(40, 45, 0))

		gui.set_scale(self.icon2, vmath.vector3(0.8, 0.8, 0.8))

		gui.set_position(self.text_plus1, vmath.vector3(-20, -10, 0))

		gui.set_enabled(self.icon3, false)
		gui.set_enabled(self.icon4, false)
		gui.set_enabled(self.text_item3, false)
		gui.set_enabled(self.text_item4, false)
		gui.set_enabled(self.text_plus2, false)
		gui.set_enabled(self.text_plus3, false)

		gui.play_flipbook(self.icon2, 'gem1_bundle2')

		gui.set_text(self.text_item1, translate("PERPETUAL"))
		gui.set_text(self.text_item2, global.amount2_iap)

	elseif data.value == apimanager.FRUIT_PACK_NOADS_ID then
		gui.set_position(self.icon1, vmath.vector3(-173, -10, 0))
		gui.set_position(self.icon2, vmath.vector3(-40, -20, 0))
		gui.set_position(self.icon3, vmath.vector3(90, -15, 0))
		gui.set_position(self.icon4, vmath.vector3(210, -8, 0))

		gui.set_position(self.text_item2, vmath.vector3(-40, 45, 0))
		gui.set_position(self.text_item3, vmath.vector3(90, 45, 0))

		gui.set_position(self.text_plus1, vmath.vector3(-90, -10, 0))
		gui.set_position(self.text_plus2, vmath.vector3(18, -10, 0))
		gui.set_position(self.text_plus3, vmath.vector3(160, -10, 0))

		gui.set_scale(self.icon2, vmath.vector3(0.8, 0.8, 0.8))

		gui.set_enabled(self.text_item1, false)
		gui.set_enabled(self.text_item4, false)

		gui.play_flipbook(self.icon2, 'gem1_bundle3')
		gui.play_flipbook(self.icon3, 'icon_iap_boost')
		gui.play_flipbook(self.icon4, 'icon_offer_ads')

		gui.set_text(self.text_item2, global.amount3_iap)
		gui.set_text(self.text_item3, global.boost_min_iap.." "..translate("MINUTES_SHORT"))

	elseif data.value == apimanager.FRUIT_PACK_ID then
		gui.set_position(self.icon1, vmath.vector3(-173, -10, 0))
		gui.set_position(self.icon2, vmath.vector3(-40, -20, 0))
		gui.set_position(self.icon3, vmath.vector3(90, -15, 0))

		gui.set_position(self.text_item2, vmath.vector3(-40, 45, 0))
		gui.set_position(self.text_item3, vmath.vector3(90, 45, 0))

		gui.set_position(self.text_plus1, vmath.vector3(-90, -10, 0))
		gui.set_position(self.text_plus2, vmath.vector3(18, -10, 0))
		gui.set_position(self.text_plus3, vmath.vector3(160, -10, 0))

		gui.set_scale(self.icon2, vmath.vector3(0.8, 0.8, 0.8))

		gui.set_enabled(self.icon4, false)
		gui.set_enabled(self.text_item1, false)
		gui.set_enabled(self.text_item4, false)
		gui.set_enabled(self.text_plus3, false)

		gui.play_flipbook(self.icon2, 'gem1_bundle3')
		gui.play_flipbook(self.icon3, 'icon_iap_boost')
		gui.play_flipbook(self.icon4, 'icon_offer_ads')

		gui.set_text(self.text_item2, global.amount3_iap)
		gui.set_text(self.text_item3, global.boost_min_iap.." "..translate("MINUTES_SHORT"))

	end

	self.button1:set_enabled(global.isNetworkConnected)

	if (not global.isNetworkConnected) then
		gui.set_enabled(self.icon_load, true)
		gui.set_enabled(self.btn_text, false)
	end

end

function ButtonComponent:set_visible(bool)
	gui.set_enabled(self.root, bool)

end

function ButtonComponent:set_click_zone(node)
	self.button1:set_click_zone(node)
	self.button2:set_click_zone(node)
end

function ButtonComponent:on_remove()
	self.on_click1:clear()
	self.on_click2:clear()

end

function ButtonComponent:_on_click1()
	self.on_click1:trigger(self)
end

function ButtonComponent:_on_click2()
	self.on_click2:trigger(self)
end


return ButtonComponent
