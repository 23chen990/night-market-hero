

local event = require("event.event")
local component = require("druid.component")





local ButtonComponent = component.create("button_component")

local SCHEME = {
	ROOT			= "root",
	BUTTON			= "button",
	ICON_ADS		= "icon",
	ICON1			= "icon1",
	ICON2			= "icon2",
	ICON3			= "icon3",
	ICON4			= "icon4",
	LINE1			= "line1",
	LINE2			= "line2",
	LINE3			= "line3",
	ICON_ITEM1		= "icon1_item",
	ICON_ITEM2		= "icon2_item",
	ICON_ITEM3		= "icon3_item",
	ICON_ITEM4		= "icon4_item",
	ICON_GALKA1		= "icon1_galka",
	ICON_GALKA2		= "icon2_galka",
	ICON_GALKA3		= "icon3_galka",
	ICON_GALKA4		= "icon4_galka",
	ICON_LOAD		= "icon_load",
	ICON_ATTENTION	= "attention_gems",
	TEXT_TITLE		= "text_title",
	TEXT_ITEM1		= "text_item1",
	TEXT_ITEM2		= "text_item2",
	TEXT_ITEM3		= "text_item3",
	TEXT_ITEM4		= "text_item4",
	TEXT_BUTTON		= "text_button"
}



function ButtonComponent:init(template, nodes)
	self:set_template(template)
	self:set_nodes(nodes)
	self.druid = self:get_druid()

	self.root			= self:get_node(SCHEME.ROOT)
	self.btn_buy		= self:get_node(SCHEME.BUTTON)
	self.icon_ads		= self:get_node(SCHEME.ICON_ADS)
	self.icon1			= self:get_node(SCHEME.ICON1)
	self.icon2			= self:get_node(SCHEME.ICON2)
	self.icon3			= self:get_node(SCHEME.ICON3)
	self.icon4			= self:get_node(SCHEME.ICON4)
	self.line1			= self:get_node(SCHEME.LINE1)
	self.line2			= self:get_node(SCHEME.LINE2)
	self.line3			= self:get_node(SCHEME.LINE3)
	self.icon1_item		= self:get_node(SCHEME.ICON_ITEM1)
	self.icon2_item		= self:get_node(SCHEME.ICON_ITEM2)
	self.icon3_item		= self:get_node(SCHEME.ICON_ITEM3)
	self.icon4_item		= self:get_node(SCHEME.ICON_ITEM4)
	self.icon1_galka	= self:get_node(SCHEME.ICON_GALKA1)
	self.icon2_galka	= self:get_node(SCHEME.ICON_GALKA2)
	self.icon3_galka	= self:get_node(SCHEME.ICON_GALKA3)
	self.icon4_galka	= self:get_node(SCHEME.ICON_GALKA4)
	self.icon_load		= self:get_node(SCHEME.ICON_LOAD)
	self.icon_attention	= self:get_node(SCHEME.ICON_ATTENTION)
	self.text_title		= self:get_node(SCHEME.TEXT_TITLE)
	self.text_item1		= self:get_node(SCHEME.TEXT_ITEM1)
	self.text_item2		= self:get_node(SCHEME.TEXT_ITEM2)
	self.text_item3		= self:get_node(SCHEME.TEXT_ITEM3)
	self.text_item4		= self:get_node(SCHEME.TEXT_ITEM4)
	self.btn_text		= self:get_node(SCHEME.TEXT_BUTTON)

	self.button = self.druid:new_button(self.btn_buy, self._on_click)

	self.on_click = event.create()

end

function ButtonComponent:set_data(data)
	self._data = data

	self:update_btn()

	gui.set_position(self.icon1_item, vmath.vector3(-2, -5, 0))
	gui.set_position(self.icon2_item, vmath.vector3(0, -8, 0))
	gui.set_position(self.icon3_item, vmath.vector3(0, -7, 0))
	gui.set_position(self.icon4_item, vmath.vector3(0, -8, 0))

	gui.set_enabled(self.icon1_galka, false)
	gui.set_enabled(self.icon2_galka, false)
	gui.set_enabled(self.icon3_galka, false)
	gui.set_enabled(self.icon4_galka, false)

	gui.set_enabled(self.icon_attention, false)
	gui.animate(self.icon_attention, gui.PROP_SCALE, vmath.vector3(1.2, 1.2, 1.2), gui.EASING_LINEAR, 0.5, 0, nil, gui.PLAYBACK_LOOP_PINGPONG)

end

function ButtonComponent:update_time(vRemainTime)
	local str_time = translate("RESET_IN").." "..vRemainTime
	gui.set_text(self.text_title, str_time)
	utils.updateTextWidth(self.text_title, 260, 1.0)

end

function ButtonComponent:update_text_gems(vData)
	gui.set_text(self.text_item1, vData[1])
	gui.set_text(self.text_item2, vData[2])
	gui.set_text(self.text_item3, vData[3])
	gui.set_text(self.text_item4, vData[4])

end

function ButtonComponent:update_state(vState, vTime)
	gui.set_text(self.btn_text, utf8.upper(translate("FREE")))
	utils.updateTextWidth(self.btn_text, 80, 1)

	gui.set_position(self.btn_text, vmath.vector3(22, 2, 0))
	gui.set_enabled(self.icon_ads, true)
	gui.set_enabled(self.icon_load, false)

	gui.play_flipbook(self.btn_buy, "btn_buy")
	self.button:set_enabled(global.isNetworkConnected)

	if (vState == 0) then
		gui.set_enabled(self.icon1_galka, false)
		gui.set_enabled(self.icon2_galka, false)
		gui.set_enabled(self.icon3_galka, false)
		gui.set_enabled(self.icon4_galka, false)

		gui.play_flipbook(self.icon1, "window_gems1")
		gui.play_flipbook(self.icon2, "window_gems1")
		gui.play_flipbook(self.icon3, "window_gems1")
		gui.play_flipbook(self.icon4, "window_gems1")

		gui.play_flipbook(self.line1, "line_gems1")
		gui.play_flipbook(self.line2, "line_gems1")
		gui.play_flipbook(self.line3, "line_gems1")

		self:check_cooldown(vTime)

	elseif (vState == 1) then
		gui.set_enabled(self.icon1_galka, true)
		gui.set_enabled(self.icon2_galka, false)
		gui.set_enabled(self.icon3_galka, false)
		gui.set_enabled(self.icon4_galka, false)

		gui.play_flipbook(self.icon1, "window_gems2")
		gui.play_flipbook(self.icon2, "window_gems1")
		gui.play_flipbook(self.icon3, "window_gems1")
		gui.play_flipbook(self.icon4, "window_gems1")

		gui.play_flipbook(self.line1, "line_gems1")
		gui.play_flipbook(self.line2, "line_gems1")
		gui.play_flipbook(self.line3, "line_gems1")

		self:check_cooldown(vTime)

	elseif (vState == 2) then
		gui.set_enabled(self.icon1_galka, true)
		gui.set_enabled(self.icon2_galka, true)
		gui.set_enabled(self.icon3_galka, false)
		gui.set_enabled(self.icon4_galka, false)

		gui.play_flipbook(self.icon1, "window_gems2")
		gui.play_flipbook(self.icon2, "window_gems2")
		gui.play_flipbook(self.icon3, "window_gems1")
		gui.play_flipbook(self.icon4, "window_gems1")

		gui.play_flipbook(self.line1, "line_gems2")
		gui.play_flipbook(self.line2, "line_gems1")
		gui.play_flipbook(self.line3, "line_gems1")

		self:check_cooldown(vTime)

	elseif (vState == 3) then
		gui.set_enabled(self.icon1_galka, true)
		gui.set_enabled(self.icon2_galka, true)
		gui.set_enabled(self.icon3_galka, true)
		gui.set_enabled(self.icon4_galka, false)

		gui.play_flipbook(self.icon1, "window_gems2")
		gui.play_flipbook(self.icon2, "window_gems2")
		gui.play_flipbook(self.icon3, "window_gems2")
		gui.play_flipbook(self.icon4, "window_gems1")

		gui.play_flipbook(self.line1, "line_gems2")
		gui.play_flipbook(self.line2, "line_gems2")
		gui.play_flipbook(self.line3, "line_gems1")

		self:check_cooldown(vTime)

	elseif (vState == 4) then
		gui.set_enabled(self.icon1_galka, true)
		gui.set_enabled(self.icon2_galka, true)
		gui.set_enabled(self.icon3_galka, true)
		gui.set_enabled(self.icon4_galka, true)

		gui.play_flipbook(self.icon1, "window_gems2")
		gui.play_flipbook(self.icon2, "window_gems2")
		gui.play_flipbook(self.icon3, "window_gems2")
		gui.play_flipbook(self.icon4, "window_gems2")

		gui.play_flipbook(self.line1, "line_gems2")
		gui.play_flipbook(self.line2, "line_gems2")
		gui.play_flipbook(self.line3, "line_gems2")

		gui.set_text(self.btn_text, utf8.upper(translate("SOLD_OUT")))
		utils.updateTextWidth(self.btn_text, 120, 1)
		gui.set_position(self.btn_text, vmath.vector3(0, 2, 0))
		gui.set_enabled(self.icon_ads, false)

		gui.play_flipbook(self.btn_buy, "btn_insolvent")
		self.button:set_enabled(false)
		gui.set_enabled(self.icon_attention, false)

	end

	if (not global.isNetworkConnected) then
		gui.set_enabled(self.icon_load, true)
	end

end

function ButtonComponent:check_cooldown(vTime)
	local sec = vTime

	gui.set_enabled(self.icon_attention, true)

	if (sec == 0) then
		return
	end

	local list_text = {translate("SHORT_HOURS"),translate("SHORT_MINUTES"),translate("SHORT_SECONDS")}
	local str_time = utils.secToHMS(sec, false, list_text)

	gui.set_text(self.btn_text, str_time)
	utils.updateTextWidth(self.btn_text, 150, 1)
	gui.set_position(self.btn_text, vmath.vector3(0, 2, 0))
	gui.set_enabled(self.icon_ads, false)

	self.button:set_enabled(false)
	gui.set_enabled(self.icon_attention, false)

end

function ButtonComponent:get_data()
	return self._data
end

function ButtonComponent:update_btn()
	

end

function ButtonComponent:set_visible(bool)
	gui.set_enabled(self.root, bool)

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
