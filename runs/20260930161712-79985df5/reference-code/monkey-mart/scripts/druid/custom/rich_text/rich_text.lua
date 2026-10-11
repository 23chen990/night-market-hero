local component = require("druid.component")
local rich_text = require("druid.custom.rich_text.module.rt")








































































local M = component.create("rich_text")




function M:init(text_node, value)
	self.root = self:get_node(text_node)
	self.text_prefab = self.root

	self._last_value = value or gui.get_text(self.text_prefab)
	self._settings = self:_create_settings()

	gui.set_text(self.root, "")

	if value then
		self:set_text(value)
	end
end



function M:on_layout_change()
	if self._last_value then
		self:set_text(self._last_value)
	end
end




function M:on_style_change(style)
	self.style = {
		COLORS = style.COLORS or {},
		ADJUST_STEPS = style.ADJUST_STEPS or 20,
		ADJUST_SCALE_DELTA = style.ADJUST_SCALE_DELTA or 0.02,
	}
end

































function M:set_text(text)
	text = text or ""
	self:clear()
	self._last_value = text

	local words, settings, line_metrics = rich_text.create(text, self._settings, self.style)
	line_metrics = rich_text.adjust_to_area(words, settings, line_metrics, self.style)

	self._words = words
	self._line_metrics = line_metrics

	return words, line_metrics
end




function M:get_text()
	return self._last_value
end



function M:on_remove()
	gui.set_scale(self.root, self._default_scale)
	gui.set_size(self.root, self._default_size)
	self:clear()
end



function M:clear()
	if self._words then
		rich_text.remove(self._words)
		self._words = nil
	end
	self._last_value = nil
end





function M:tagged(tag)
	if not self._words then
		return {}
	end

	return rich_text.tagged(self._words, tag)
end




function M:get_words()
	return self._words
end




function M:get_line_metric()
	return self._line_metrics
end




function M:_create_settings()
	local root_size = gui.get_size(self.root)
	local scale = gui.get_scale(self.root)

	self._default_size = root_size
	self._default_scale = scale

	root_size.x = root_size.x * scale.x
	root_size.y = root_size.y * scale.y
	gui.set_size(self.root, root_size)
	gui.set_scale(self.root, vmath.vector3(1))

	return {
		
		
		adjust_scale = 1,
		parent = self.root,
		scale = scale,
		width = root_size.x,
		height = root_size.y,
		combine_words = false, 
		text_prefab = self.text_prefab,
		pivot = gui.get_pivot(self.root),

		
		shadow = gui.get_shadow(self.root),
		outline = gui.get_outline(self.root),
		text_leading = gui.get_leading(self.root),
		is_multiline = gui.get_line_break(self.root),

		
		image_pixel_grid_snap = false, 
	}
end


return M
