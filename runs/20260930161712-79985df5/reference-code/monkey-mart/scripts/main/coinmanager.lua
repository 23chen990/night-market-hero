local M = {

}

function M.get_balance(vType)
    if (vType == 'gems') then
        return global.amount_gems
    elseif (vType == 'coins1') then
        return global.amount_coins1
    elseif (vType == 'coins2') then
        return global.amount_coins2
    elseif (vType == 'coins3') then
        return global.amount_coins3
    elseif (vType == 'coins4') then
        return global.amount_coins4
    elseif (vType == 'coins5') then
        return global.amount_coins5
    elseif (vType == 'coins6') then
        return global.amount_coins6
    elseif (vType == 'coinsH') then
        return global.amount_coinsH
    elseif (vType == 'coinsC') then
        return global.amount_coinsC
    end

    

    local num = global.numMarket

    if (global.numMarket == 101) then
        num = 'H'
    elseif (global.numMarket == 102) then
        num = 'C'
    end

    return global["amount_coins"..num]
end

function M.plus_balance(vValue, vType)
    if (vType == 'coinsH') then 
        global.amount_coinsH = global.amount_coinsH + vValue
        return
    elseif (vType == 'coinsC') then
        global.amount_coinsC = global.amount_coinsC + vValue
        return
    elseif (vType == 'gems') then
        global.amount_gems = global.amount_gems + vValue
        return
    end

    local num = global.numMarket

    if (global.numMarket == 101) then
        num = 'H'
    elseif (global.numMarket == 102) then
        num = 'C'
    end

    global["amount_coins"..num] = global["amount_coins"..num] + vValue

end

function M.minus_balance(vValue, vType)
    if (vType == 'coinsH') then
        global.amount_coinsH = global.amount_coinsH - vValue
        return
    elseif (vType == 'coinsC') then
        global.amount_coinsC = global.amount_coinsC - vValue
        return
    elseif (vType == 'gems') then
        global.amount_gems = global.amount_gems - vValue
        return
    end

    local num = global.numMarket

    if (global.numMarket == 101) then
        num = 'H'
    elseif (global.numMarket == 102) then
        num = 'C'
    end

    global["amount_coins"..num] = global["amount_coins"..num] - vValue

end

function M.get_icon_name()
    local num = global.numMarket

    if (global.numMarket == 101) then
        num = 'H'
    elseif (global.numMarket == 102) then
        num = 'C'
    end

    return 'cash'..num
end

function M.get_cashlist_name()
    local num = global.numMarket

    if (global.numMarket == 101) then
        num = 'H'
    elseif (global.numMarket == 102) then
        num = 'C'
    end

    return 'cash_list'..num
end

function M.get_cashads_name()
    local num = global.numMarket
    local value = 'cash'..num..'_bundle1'

    if (global.numMarket == 101) then
        value = 'cashH_bundle1'
    elseif (global.numMarket == 102) then
        value = 'cashC_bundle1'
    end

    return value
end

return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
