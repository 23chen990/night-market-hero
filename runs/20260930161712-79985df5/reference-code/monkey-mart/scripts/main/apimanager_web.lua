local M = {

}

function M.my_remote_configs_listener()

end



function M.init_html()
    if html5 then
        local isMobile = html5.run("/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)")

        if isMobile == 'true' then
            global.isDesktop = false
        else
            global.isDesktop = true
        end

        local iPad = html5.run("(navigator.userAgent.match(/(iPad)/) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))")

        if iPad == 'true' then
            global.isDesktop = false
        end

        local domain = html5.run("window.location.hostname")

        if (domain == "tinydobbins.com") or (domain == "localhost") or (domain == "127.0.0.1") then
            global.isAllowDebug = true

            if gameanalytics then
                
            end
        else
            lume.trace('[ POKI_API ]')

            poki_sdk.set_debug(false)

            M.send_leveldata()

            if (domain ~= "inspector-uploads.poki-user-content.com") then
                M.poki_check()  
            end

            if poki_sdk.is_ad_blocked() then
                global.isAdBlocked = true
            end

        end

        if gameanalytics then
            gameanalytics.setRemoteConfigsListener(M.my_remote_configs_listener)

            if global.isDebug then
                
                
            end
        end

    end
end

function M.poki_check()
	html5.run("const _0x1918 = ['top', 'indexOf', 'aHR0cHM6Ly9wb2tpLmNvbS9zaXRlbG9jaw==', 'hostname', 'length', 'location', 'LnBva2ktZ2RuLmNvbQ==', 'href']; (function (_0x4a02b5, _0x5c0c3d) { const _0x56a85d = function (_0x375c0e) { while (--_0x375c0e) { _0x4a02b5.push(_0x4a02b5.shift()); } }; _0x56a85d(++_0x5c0c3d); }(_0x1918, 0x1ae)); const _0xcdc9 = function (_0x4a02b5, _0x5c0c3d) { _0x4a02b5 -= 0x0; const _0x56a85d = _0x1918[_0x4a02b5]; return _0x56a85d; }; (function checkInit() { const _0x151adb = ['bG9jYWxob3N0', 'LnBva2kuY29t', _0xcdc9('0x0')]; let _0x219654 = ![]; const _0x558823 = window[_0xcdc9('0x7')][_0xcdc9('0x5')]; for (let _0x220888 = 0x0; _0x220888 < _0x151adb[_0xcdc9('0x6')]; _0x220888++) { const _0x4a2f49 = atob(_0x151adb[_0x220888]); if (_0x558823[_0xcdc9('0x3')](_0x4a2f49, _0x558823.length - _0x4a2f49.length) !== -0x1) { _0x219654 = !![]; break; } } if (!_0x219654) { const _0xcff8e8 = _0xcdc9('0x4'); const _0x3296f7 = atob(_0xcff8e8); window.location[_0xcdc9('0x1')] = _0x3296f7; window[_0xcdc9('0x2')][_0xcdc9('0x7')] !== window[_0xcdc9('0x7')] && (window[_0xcdc9('0x2')][_0xcdc9('0x7')] = window[_0xcdc9('0x7')]); } }());")

end

function M.send_leveldata()
    if global.isAllowDebug then
        return
    end

    local value = 'mart-'..global.numMarket

    local str_code = "navigator.sendBeacon('https://leveldata.poki.io/"..value.."', '1183520a-1ec4-4f33-a7ce-7673c60f912c')"

    if html5 then
        html5.run(str_code)
    end

end



function M.show_interstitial()
    if global.isCommercialBreak or global.isRewardBreak then
        lume.trace('[ WARNING ] commercial_break / rewardbreak already!')
        return
    end

    global.isCommercialBreak = true

    if global.isDebug then
        msg.post(url_popup_message, "updateLoadAds", {value = true})
    end

    if html5 and poki_sdk then
        if global.isAllowDebug then
            timer.delay(0.5, false, function()
                msg.post(url_popup_message, "updateLoadAds", {value = false})
                gameState:gameplayStart()
                global.isCommercialBreak = false
            end)
            return
        end

        global.isMutedForAds = true
        sound.set_group_gain("sfx", 0)
        sound.set_group_gain("music", 0)

        lume.trace('[ POKI_API ] commercial_break')

        poki_sdk.commercial_break(
            function()
                lume.trace('[ POKI_API ] start game after commercial_break')

                if global.isDebug then
                    msg.post(url_popup_message, "updateLoadAds", {value = false})
                end

                if global.isMutedForAds then
                    sound.set_group_gain("sfx", (global.isMutedSfx) and 0 or global.gainSFX)
                    sound.set_group_gain("music", (global.isMutedMusic) and 0 or global.gainMusic)
                    global.isMutedForAds = false
                end

                gameState:gameplayStart()

                global.isCommercialBreak = false
            end
        )
    else
        

        timer.delay(0.5, false, function()
            if global.isDebug then
                msg.post(url_popup_message, "updateLoadAds", {value = false})
            end

            gameState:gameplayStart()

            global.isCommercialBreak = false

        end)
    end

end

function M.show_rewarded(sender, type, index, index2, category, details, placement)
    if global.isCommercialBreak or global.isRewardBreak then
        lume.trace('[ WARNING ] commercial_break / rewardbreak already!')
        return
    end

    global.isRewardBreak = true

    

    msg.post(url_popup_message, "updateLoadAds", {value = true})

    if html5 and poki_sdk then
        if global.isAllowDebug then
            timer.delay(0.5, false, function()
                M.getReward(sender, type, index, index2)
                global.isRewardBreak = false
                msg.post(url_popup_message, "updateLoadAds", {value = false})
            end)
            return
        end

        global.isMutedForAds = true
        sound.set_group_gain("sfx", 0)
        sound.set_group_gain("music", 0)

        lume.trace('[ POKI_API ] rewarded_break')

        poki_sdk.rewarded_break(
            function(self, success)
                msg.post(url_popup_message, "updateLoadAds", {value = false})

                if global.isMutedForAds then
                    sound.set_group_gain("sfx", (global.isMutedSfx) and 0 or global.gainSFX)
                    sound.set_group_gain("music", (global.isMutedMusic) and 0 or global.gainMusic)
                    global.isMutedForAds = false
                end

                if success then
                    M.getReward(sender, type, index, index2)
                else
                    msg.post(sender, "unlock_input")
                    lume.trace('[ POKI_API ] rewarded_break -> try later')
                    
                    msg.post(url_screen_game, "hideOffer", {value = type})
                end

                global.isRewardBreak = false
            end
        ,category, details, placement)
    else
        lume.trace('[ API ] rewarded_break')

        timer.delay(0.5, false, function()
            msg.post(url_popup_message, "updateLoadAds", {value = false})

            M.getReward(sender, type, index, index2)
            global.isRewardBreak = false

            
            
            
        end)
    end

end

function M.getReward(sender, vType, index, index2)
	if vType == 'hats' then
		global.have_hats[index][2] = global.have_hats[index][2] + 1

		if global.data_hats[index].amount == global.have_hats[index][2] then
			global.have_hats[index][1] = true
		end

		msg.post(sender, "bought_item", {index = index})

	elseif vType == 'upgrade' then
		msg.post(sender, "bought_item", {index = index, index2 = index2})

	elseif vType == 'boost_bankomat' then
		msg.post(url_screen_game, "activateBoost", {value = vType})

    elseif vType == 'boost_pig' then
        msg.post(url_screen_game, "activateBoost", {value = vType})

    elseif vType == 'delivery_x3' then
        msg.post(url_screen_game, "activateBoost", {value = vType})

	elseif vType == 'boost_coinsX2' then
		msg.post(url_screen_game, "activateBoost", {value = vType})

	elseif vType == 'boost_energyWork' then
		msg.post(url_screen_game, "activateBoost", {value = vType})

	elseif vType == 'boost_energyZavod' then
		msg.post(url_screen_game, "activateBoost", {value = vType})

	elseif vType == 'boost_manager' then
		msg.post(url_screen_game, "activateBoost", {value = vType})

    elseif vType == 'free_gems' then
        global.state_daily_gems = global.state_daily_gems + 1

        global.rewardedGems = global.gems_by_ads[global.state_daily_gems]
        gameState:addRewardedGems()

        msg.post(url_popup_iap, "update_offer_daily", {index = index})
        msg.post(url_popup_iap, "unlock_input")

        datamanager.set_cooldown_daily()
        datamanager.update_save_value('daily_gems')

        gameState:checkAvailableGems()

    elseif vType == 'boost_boots' then
        msg.post(url_screen_game, "activateBoost", {value = vType})

    elseif vType == 'boost_fillWarehouse' then
        msg.post(url_screen_game, "activateBoost", {value = vType})

	end

    quest_manager.checkQuest('watch_ad')

	if html5 or global.isMobileTrue then
		if gameanalytics then
			gameanalytics.addDesignEvent {
				eventId = "REWARD:"..vType,
				value = 1
			}
		end
	end

end



function M.start_ad_break(vCountTime)

end

function M.finish_ad_break()

end

function M.cancel_ad_break()

end

function M.iap_purchased(vIdent)
    

end



function M.sendAnalytics(vEvent, vValue)
    lume.trace('sendAnalytics',"EVENT:"..vEvent.."_"..vValue)

    if html5 or global.isMobileTrue then
        if gameanalytics then
            gameanalytics.addDesignEvent {
                eventId = "EVENT:"..vEvent.."_"..vValue,
                value = 1
            }
        end
    end

end

function M.gameanalytics_event(vTypeAds, vEvent)
    lume.trace('[ ga_event ]', vTypeAds, vEvent)

end


function M.update_playtime()
    global.s_playtime = global.s_playtime + 1

    

end

function M.check_network()

end

function M.retention_event()
    if (global.launch_date > 0) then

    end

end



return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
