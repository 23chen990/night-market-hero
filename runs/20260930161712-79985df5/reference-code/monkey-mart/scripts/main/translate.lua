local M = {
	default_language = "en",
	
	translations = {},
}










function M.add_translations(translations)
	for language,translations_for_language in pairs(translations) do
		M.translations[language] = M.translations[language] or {}
		for key,translation in pairs(translations_for_language) do
			M.translations[language][key] = translation
		end
	end
end

function M.duplicate_language(fromLanguage, toLanguage)
	M.translations[toLanguage] = M.translations[fromLanguage]
end



function M.change_language(language)
	M.current_language = language
end





function M.translate(key, ...)
	local t = M.translations[M.current_language] or M.translations[M.default_language]
	if not t or not t[key] then
		return key
	else
		if select("#", ...) > 0 then
			return t[key]:format(...)
		else
			return t[key]
		end
	end
end


return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
