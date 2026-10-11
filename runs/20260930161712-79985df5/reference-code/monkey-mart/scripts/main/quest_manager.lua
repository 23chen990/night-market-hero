local M = {
    quests = {},
    id_types = {},

    list = {
        {
            description = "LOGIN_DAILY",
            reward = 2,
            count_max = 1
        },
        {
            description = "WATCH_REWARDED_ADS",
            reward = 2,
            count_max = 4
        },
        {
            description = "COLLECT_CASH",
            reward = 2,
            count_max = 5000
        },
        {
            description = "SERVER_CUSTOMERS",
            reward = 2,
            count_max = 60
        },
        {
            description = "STOCK_PRODUCTS",
            reward = 2,
            count_max = 120
        },
        {
            description = "USE_UPGRADE",
            reward = 2,
            count_max = 4
        },
        {
            description = "BUY_FACILITIES",
            reward = 2,
            count_max = 2
        },
        {
            description = "CHASE_ROWDY",
            reward = 2,
            count_max = 5
        },
        {
            description = "FEED_PARROT",
            reward = 2,
            count_max = 2
        },
        {
            description = "FIX_APPLIANCE",
            reward = 2,
            count_max = 15
        }
    }
}

function M.init()
    lume.trace('[ QUEST MANAGER ] init')
    M.id_types['login']             = 1
    M.id_types['watch_ad']          = 2
    M.id_types['collect_coins']     = 3
    M.id_types['serve_customer']    = 4
    M.id_types['fill_warehouse']    = 5
    M.id_types['upgrade']           = 6
    M.id_types['buy_place']         = 7
    M.id_types['kick_hooligan']     = 8
    M.id_types['feed_parrot']       = 9
    M.id_types['fix_appliance']     = 10

end

function M.is_available_upgrade()
    local isAvailable = false
    local n = global.numMarket
    local upgrades_level = global["upgrades_level"..n]
    local upgrades_max = global["upgrades_max"..n]

    if (upgrades_max == nil) or (upgrades_level == nil) then
        return false
    end

    local amountUpgrades = #upgrades_max
    local count = 0
    local count_max = M.list[6].count_max

    if (n == 1) then
        amountUpgrades = amountUpgrades - 1
    end

    for i=2,amountUpgrades do
        for j=1,3 do
            lvl = upgrades_level[i][j]
            lvl_max = upgrades_max[i][j]

            if (lvl <= lvl_max) then
                count = count + (lvl_max - lvl + 1)
            end
        end
    end

    if (count >= count_max) then
        isAvailable = true
    end

    lume.trace('is_available_upgrade', isAvailable, 'count', count, 'count_max', count_max)

    return isAvailable
end

function M.is_available_buy()
    local isAvailable = false
    local count = 0
    local count_max = M.list[7].count_max
    local n = global.numMarket
    local have_places = global["have_places"..n]
    local pricePlaces = global["pricePlaces"..n]

    if (have_places == nil) or (pricePlaces == nil) then
        return false
    end

    if (#have_places ~= #pricePlaces) then
        return false
    end

    for k,v in pairs(have_places) do
        if (v[1] == false) and (pricePlaces[k] > 0) then
            
            count = count + 1
        end
    end

    if (count >= count_max) then
        isAvailable = true
    end

    lume.trace('is_available_buy', isAvailable, 'count', count, 'count_max', count_max)

    return isAvailable
end

function M.is_available_hooligan()
    local isAvailable = false
    local n = global.numMarket
    local numSale = global["numSale"..n]

    if (numSale == nil) then
        return false
    end

    local value = datamanager.get_num_sale_values(n)[1]

    isAvailable = numSale >= value

    lume.trace('is_available_hooligan', isAvailable, 'NUM_SALE_CRAZY', value, 'numSale', numSale)

    return isAvailable
end

function M.is_available_parrot()
    local isAvailable = false
    local n = global.numMarket
    local numSale = global["numSale"..n]

    if (numSale == nil) then
        return false
    end

    local value = datamanager.get_num_sale_values(n)[3]

    isAvailable = numSale >= value

    lume.trace('is_available_parrot', isAvailable, 'NUM_SALE_PARROT', value, 'numSale', numSale)

    return isAvailable
end

function M.is_available_zavod()
    local isAvailable = false
    local n = global.numMarket
    local numSale = global["numSale"..n]

    if (numSale == nil) then
        return false
    end

    local value = datamanager.get_num_sale_values(n)[4]

    isAvailable = numSale >= value

    lume.trace('is_available_zavod', isAvailable, 'NUM_SALE_ZAVOD', value, 'numSale', numSale)

    return isAvailable
end

function M.get_quests_id()
    local id_quests = {1,2}
    local availableQuests = {3,4,5}

    if M.is_available_upgrade() then
        table.insert(availableQuests, 6)
    end
    if M.is_available_buy() then
        table.insert(availableQuests, 7)
    end
    if M.is_available_hooligan() then
        table.insert(availableQuests, 8)
    end
    if M.is_available_parrot() then
        table.insert(availableQuests, 9)
    end
    if M.is_available_zavod() then
        table.insert(availableQuests, 10)
    end

    utils.shuffle(availableQuests)

    table.insert(id_quests, availableQuests[1])
    table.insert(id_quests, availableQuests[2])
    table.insert(id_quests, availableQuests[3])

    return id_quests
end

function M.reset()
    lume.trace('[ QUEST MANAGER ] reset')

    M.quests = {}

    local id_quests = M.get_quests_id()

    for i=1,5 do
        table.insert(M.quests, {
            quest_id = id_quests[i],
            count_now = 0,
            is_claimed = false
        })
    end

    for k,v in pairs(M.quests) do
        global.quests[k] = v
    end

    datamanager.update_save_value('quests')

end

function M.load()
    lume.trace('[ QUEST MANAGER ] load')
    M.quests = {}

    if (#global.quests == 0) then
        lume.trace('[ WARNING ] global.quests NOT found')
        M.reset()
        return
    end

    for k,v in pairs(global.quests) do
        M.quests[k] = v
    end

end

function M.setQuestClaimed(vNum)
    M.quests[vNum].is_claimed = true

end

function M.getQuestData(vNum)
    if (#M.quests == 0) then
        return nil
    end

    local quest_id      = M.quests[vNum].quest_id
    local count_now     = M.quests[vNum].count_now
    local is_claimed    = M.quests[vNum].is_claimed

    local count_max     = M.list[quest_id].count_max
    local reward		= M.list[quest_id].reward
    local description	= M.list[quest_id].description

    return {
        count_now = count_now,
        count_max = count_max,
        reward = reward,
        description = description,
        is_claimed = is_claimed
    }
end

function M.getQuestReward(vNum)
    local id = M.quests[vNum].quest_id

    return M.list[id].reward
end

function M.checkQuest(vType, vValue)
    
    local num = 0
    local value = 1

    if vValue then
        value = vValue
    end

    for k,v in pairs(M.quests) do
        
        if v.quest_id == M.id_types[vType] then
            num = k
        end
    end

    if (num > 0) then
        M.quests[num].count_now = M.quests[num].count_now + value

        local id = M.quests[num].quest_id
        local count_max = M.list[id].count_max

        if (M.quests[num].count_now > count_max) then
            M.quests[num].count_now = count_max
        end

        if (M.quests[num].count_now == count_max) then
            datamanager.update_save_value('quests')
        end
    else
        
    end

end

function M.checkAvailableClaim()
    local isAvailable = false
    local count_max = 0

    for k,v in pairs(M.quests) do
        count_max = M.list[v.quest_id].count_max

        if (v.count_now >= count_max) and (not v.is_claimed) then
            isAvailable = true
        end
    end

    return isAvailable
end

return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
