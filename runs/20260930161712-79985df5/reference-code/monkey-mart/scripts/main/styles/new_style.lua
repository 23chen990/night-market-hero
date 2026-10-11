local const = require("druid.const")
local settings = require("druid.system.settings")
local anims = require("main.styles.new_anims")

local M = {}


M["button"] = {
	HOVER_SCALE = vmath.vector3(-0.1, -0.1, 1),
	HOVER_TIME = 0.1,
	SCALE_CHANGE = vmath.vector3(0.035, 0.035, 1),
	BTN_SOUND = "click",
	BTN_SOUND_DISABLED = "click",
	DISABLED_COLOR = vmath.vector4(1, 1, 1, 0.8),
	ENABLED_COLOR = vmath.vector4(1),
	LONGTAP_TIME = 0.4,
	AUTOHOLD_TRIGGER = 0.8,
	DOUBLETAP_TIME = 0.4,

	on_hover = function(self, node, state)
		local scale_to = self.start_scale + M.button.HOVER_SCALE

		local target_scale = state and scale_to or self.start_scale

		anims.hover_scale(self, target_scale, M.button.HOVER_TIME)
	end,

	on_click = function(self, node)
		local scale_to = self.start_scale

		anims.tap_scale_animation(self, scale_to, M.button.HOVER_TIME)

		settings.play_sound(M.button.BTN_SOUND)
	end,

	on_click_disabled = function(self, node)
		settings.play_sound(M.button.BTN_SOUND_DISABLED)
	end,

	on_set_enabled = function(self, node, state)
		if state then
			gui.set_color(node, M.button.ENABLED_COLOR)
		else
			gui.set_color(node, M.button.DISABLED_COLOR)
		end
	end
}


M["drag"] = {
	DRAG_DEADZONE = 10, 
}


M["static_grid"] = {
	IS_DYNAMIC_NODE_POSES = false, 
	IS_ALIGN_LAST_ROW = true, 
}


M["scroll"] = {
	ANIM_SPEED = 0.2, 
	BACK_SPEED = 0.35, 
	FRICT = 0.93, 
	FRICT_HOLD = 0.79, 
	INERT_THRESHOLD = 2.5, 
	INERT_SPEED = 30, 
	EXTRA_STRETCH_SIZE = 100, 
	POINTS_DEADZONE = 20, 
	WHEEL_SCROLL_SPEED = 20, 
	WHEEL_SCROLL_INVERTED = false, 
	WHEEL_SCROLL_BY_INERTION = true, 
	SMALL_CONTENT_SCROLL = true, 
}


M["progress"] = {
	SPEED = 5, 
	MIN_DELTA = 0.005
}


M["checkbox"] = {
	on_change_state = function(self, node, state, is_instant)
		local target = state and 1 or 0
		if not is_instant then
			gui.animate(node, "color.w", target, gui.EASING_OUTSINE, 0.1)
		else
			local color = gui.get_color(node)
			color.w = target
			gui.set_color(node, color)
		end
	end
}


M["swipe"] = {
	SWIPE_THRESHOLD = 50,
	SWIPE_TIME = 0.4,
	SWIPE_TRIGGER_ON_MOVE = true
}


M["input"] = {
	IS_LONGTAP_ERASE = true,
	BUTTON_SELECT_INCREASE = 1.06,
	MASK_DEFAULT_CHAR = "*",
	IS_UNSELECT_ON_RESELECT = false,

	on_select = function(self, button_node)
		local target_scale = self.button.start_scale
		gui.animate(button_node, "scale", target_scale * M.input.BUTTON_SELECT_INCREASE, gui.EASING_OUTSINE, 0.15)
	end,

	on_unselect = function(self, button_node)
		local start_scale = self.button.start_scale
		gui.animate(button_node, "scale", start_scale, gui.EASING_OUTSINE, 0.15)
	end,

	on_input_wrong = function(self, button_node)
		local start_pos = self.button.start_pos
		gui.animate(button_node, "position.x", start_pos.x - 3, gui.EASING_OUTSINE, 0.05, 0, function()
			gui.animate(button_node, "position.x", start_pos.x + 3, gui.EASING_OUTSINE, 0.1, 0, function()
				gui.animate(button_node, "position.x", start_pos.x, gui.EASING_OUTSINE, 0.05)
			end)
		end)
	end,

	button = {
		LONGTAP_TIME = 0.4,
		AUTOHOLD_TRIGGER = 0.8,
		DOUBLETAP_TIME = 0.4,
	}
}


M["text"] = {
	TRIM_POSTFIX = "...",
	DEFAULT_ADJUST = const.TEXT_ADJUST.DOWNSCALE
}


M["hotkey"] = {
	MODIFICATORS = { "key_lshift", "key_rshift", "key_lctrl", "key_rctrl", "key_lalt", "key_ralt", "key_lsuper", "key_rsuper" }, 
}


return M
