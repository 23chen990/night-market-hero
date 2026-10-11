local M = {
    appname = config.appname,
    file    = "config"
}

function M.init_saves()
    lume.trace('> init_saves <')

    defsave.appname = M.appname
    defsave.verbose = false
    defsave.use_default_data = false
    defsave.load(M.file)

end

function M.load_saves()
    lume.trace('> load_saves <')

    local launch_date   = defsave.get(M.file, "launch_date")
    local lastplay_date = defsave.get(M.file, "lastplay_date")
    local state_daily_gems      = defsave.get(M.file, "state_daily_gems")
    local state_daily_bonus     = defsave.get(M.file, "state_daily_bonus")
    local cooldown_daily_gems   = defsave.get(M.file, "cooldown_daily_gems")
    local isAllowBonus          = defsave.get(M.file, "isAllowBonus")
    local language     = defsave.get(M.file, "language")
	local isMutedMusic = defsave.get(M.file, "isMutedMusic")
	local isMutedSfx   = defsave.get(M.file, "isMutedSfx")
    local selectedHat  = defsave.get(M.file, "selectedHat")
    local amount_gems   = defsave.get(M.file, "amount_gems")
    local have_hats    = defsave.get(M.file, "have_hats")
	local numMarket    = defsave.get(M.file, "numMarket")
    local tick_boosts   = defsave.get(M.file, "tick_boosts")
    local have_iap      = defsave.get(M.file, "have_iap")
    local s_ads_count   = defsave.get(M.file, "s_ads_count")
    local s_playtime    = defsave.get(M.file, "s_playtime")
    local s_purchases   = defsave.get(M.file, "s_purchases")
    local quests        = defsave.get(M.file, "quests")

    if type(launch_date) == "number" then
        global.launch_date = launch_date
    else
        lume.trace('> isFirstTime <')
        

        local data = os.time()
        global.launch_date = data
    end

    if type(lastplay_date) == "number" then
        global.lastplay_date = lastplay_date
    end

    if type(state_daily_gems) == "number" then
        global.state_daily_gems = state_daily_gems
    end

    if type(state_daily_bonus) == "number" then
        global.state_daily_bonus = state_daily_bonus
    end

    if type(cooldown_daily_gems) == "number" then
        global.cooldown_daily_gems = cooldown_daily_gems
    end

    if type(isAllowBonus) == "boolean" then
        global.isAllowBonus = isAllowBonus
    end

    if type(language) == "string" then
        global.defaultLanguage = language
    else
        local languageSystem = global.systemLanguage
        local index = table.indexOf(global.avaiableLanguages, languageSystem)

        if index > 0 then
            global.defaultLanguage = languageSystem
        end

    end
    if type(isMutedMusic) == "boolean" then
        global.isMutedMusic = isMutedMusic
    end

    if type(isMutedSfx) == "boolean" then
        global.isMutedSfx = isMutedSfx
    end

    if type(selectedHat) == "number" then
        global.selectedHat = selectedHat
    end

    if type(amount_gems) == "number" then
        global.amount_gems = amount_gems
    end

    if type(have_hats) == "table" then
        for k,v in pairs(have_hats) do
            global.have_hats[k] = v
        end
    end

    if type(numMarket) == "number" then
        global.numMarket = numMarket
    end

    if type(tick_boosts) == "table" then
        if tick_boosts[1] then
            global.tickBoostCoinsX2 = tick_boosts[1]
        end
        if tick_boosts[2] then
            global.tickBoostWorkers = tick_boosts[2]
        end
        if tick_boosts[3] then
            global.tickBoostZavods = tick_boosts[3]
        end
        if tick_boosts[4] then
            global.tickBoostManager = tick_boosts[4]
        end
        if tick_boosts[5] then
            global.tickBoostBoots = tick_boosts[5]
        end
    end

    if type(have_iap) == "table" then
        for k,v in pairs(have_iap) do
            global.have_iap[k] = v
        end
    end

	if type(s_ads_count) == "number" then
        global.s_ads_count = s_ads_count
    end

    if type(s_playtime) == "number" then
        global.s_playtime = s_playtime
    end

    if type(s_purchases) == "number" then
        global.s_purchases = s_purchases
    end

    if type(quests) == "table" then
        for k,v in pairs(quests) do
            global.quests[k] = v
        end
    end

    M.load_mart(1)
    M.load_mart(2)
    M.load_mart(3)
    M.load_mart(4)
    M.load_mart(5)
    M.load_mart(6)
    M.load_mart('H')
    M.load_mart('C')

end

function M.load_mart(vNum)
    local num = vNum
    local coins         = defsave.get(M.file, "coins"..num)
    local numSale       = defsave.get(M.file, "numSale"..num)
    local cash          = defsave.get(M.file, "cash"..num)
    local have_places   = defsave.get(M.file, "have_places"..num)
    local upgrades      = defsave.get(M.file, "upgrades"..num)

    
    if (vNum == 1) then
        if (numSale == nil) and (type(defsave.get(M.file, "numSale")) == "number") then
            lume.trace('[ WARNING ] detected the old saving system (!)')
            numSale         = defsave.get(M.file, "numSale")
            coins           = defsave.get(M.file, "coins")
            cash            = defsave.get(M.file, "cash")
            have_places     = defsave.get(M.file, "have_places")
            upgrades        = defsave.get(M.file, "upgrades")
        end
    end

    if type(numSale) == "number" then
        global["numSale"..num] = numSale
    end
    if type(coins) == "number" then
        global["amount_coins"..num] = coins
    end
    if type(cash) == "number" then
        global["amount_cashbox"..num] = cash
    end
    if type(have_places) == "table" then
        for k,v in pairs(have_places) do
            global["have_places"..num][k] = v
        end
    end
    if type(upgrades) == "table" then
        for k,v in pairs(upgrades) do
            global["upgrades_level"..num][k] = v
        end
    end

end

function M.update_saves()
    if gameState and gameState.isTutorial or global.isSkipSaveData then
        
        return
    end

    if (global.numMarket == 101) and (global.numSaleH == 0) then
        lume.trace('> update_saves SKIP [numSaleH == 0] <')
        return
    end
    if (global.numMarket == 102) and (global.numSaleC == 0) then
        lume.trace('> update_saves SKIP [numSaleC == 0] <')
        return
    end

	

    M.save_mart(1)
    M.save_mart(2)
    M.save_mart(3)
    M.save_mart(4)
    M.save_mart(5)
    M.save_mart(6)
    M.save_mart('H')
    M.save_mart('C')

	defsave.set(M.file, "launch_date",         global.launch_date)
	defsave.set(M.file, "lastplay_date",       global.lastplay_date)
    defsave.set(M.file, "state_daily_gems",    global.state_daily_gems)
    defsave.set(M.file, "state_daily_bonus",    global.state_daily_bonus)
    defsave.set(M.file, "cooldown_daily_gems",  global.cooldown_daily_gems)
    defsave.set(M.file, "isAllowBonus",         global.isAllowBonus)
    defsave.set(M.file, "language",        global.defaultLanguage)
	defsave.set(M.file, "selectedHat",     global.selectedHat)
	defsave.set(M.file, "amount_gems",     global.amount_gems)
    defsave.set(M.file, "have_hats",       global.have_hats)
	defsave.set(M.file, "isMutedMusic",    global.isMutedMusic)
	defsave.set(M.file, "isMutedSfx",      global.isMutedSfx)
    defsave.set(M.file, "numMarket",       global.numMarket)
    defsave.set(M.file, "tick_boosts",     global.tick_boosts)

	defsave.set(M.file, "have_iap",        global.have_iap)
	defsave.set(M.file, "s_ads_count",     global.s_ads_count)
	defsave.set(M.file, "s_playtime",      global.s_playtime)
	defsave.set(M.file, "s_purchases",     global.s_purchases)
	defsave.set(M.file, "quests",          global.quests)
	defsave.save_all()

end

function M.save_mart(vNum)
    local num           = vNum
    local numSale       = "numSale"..num
    local coins         = "coins"..num
    local cash          = "cash"..num
    local have_places   = "have_places"..num
    local upgrades      = "upgrades"..num

    defsave.set(M.file, numSale, global["numSale"..num])
    defsave.set(M.file, coins, global["amount_coins"..num])
    defsave.set(M.file, cash, global["amount_cashbox"..num])
    defsave.set(M.file, have_places, global["have_places"..num])
    defsave.set(M.file, upgrades, global["upgrades_level"..num])

end

function M.update_save_value(vValue)
    if gameState and gameState.isTutorial or global.isSkipSaveData then
        lume.trace('> update_saves SKIP <')
        return
    end

    if vValue == 'tick_boosts' then
        defsave.set(M.file, "tick_boosts", global.tick_boosts)

    elseif vValue == 'daily_gems' then
        defsave.set(M.file, "lastplay_date",        global.lastplay_date)
        defsave.set(M.file, "state_daily_gems",     global.state_daily_gems)
        defsave.set(M.file, "cooldown_daily_gems",  global.cooldown_daily_gems)

    elseif vValue == 'quests' then
        defsave.set(M.file, "quests", global.quests)

    elseif vValue == 'daily_bonus' then
        defsave.set(M.file, "state_daily_bonus", global.state_daily_bonus)
        defsave.set(M.file, "isAllowBonus", global.isAllowBonus)

    end

    

    defsave.save_all()

end

function M.clear_saves()
    lume.trace('> clear_saves <')

    M.init_values()

    defsave.reset_to_default(M.file)
    defsave.save(M.file)

end

function M.init_mart(num)
    global["numSale"..num] = 0
    global["amount_coins"..num] = 0
    global["amount_cashbox"..num]  = 0
    global["upgrades_level"..num] = {}
    global["have_places"..num] = {}

    local numPlaces = 1     
    local numUpgrades = 1   

    if (num == 1) then
        numPlaces = 32
        numUpgrades = 10

    elseif (num == 2) then
        numPlaces = 43
        numUpgrades = 11

    elseif (num == 3) then
        numPlaces = 44
        numUpgrades = 15

    elseif (num == 4) then
        numPlaces = 51
        numUpgrades = 10

    elseif (num == 5) then
        numPlaces = 41
        numUpgrades = 13

     elseif (num == 6) then
        numPlaces = 41
        numUpgrades = 10

    elseif (num == 'H') then
        numPlaces = 21
        numUpgrades = 3

    elseif (num == 'C') then
        numPlaces = 23
        numUpgrades = 7

    end

    for i=1,numPlaces do
        table.insert(global["have_places"..num], {false,0})
    end

    for i=1,numUpgrades do
        table.insert(global["upgrades_level"..num], {1,1,1})
    end

end

function M.clear_saves_mart(num)
    lume.trace('> clear_saves_mart <',num)

    M.init_mart(num)
    M.save_mart(num)

    if (num == 'H') then
        global.have_hats[22][1] = false
        global.have_hats[23][1] = false
        global.selectedHat = 0
    elseif (num == 'C') then
        global.have_hats[24][1] = false
        global.have_hats[25][1] = false
        global.selectedHat = 0
    end

    defsave.save_all()

end

function M.get_num_sale_values(vNumMart)
    local NUM_SALE_CRAZY    = 9
    local NUM_SALE_OFFER    = 3
    local NUM_SALE_PARROT   = 9
    local NUM_SALE_ZAVOD    = 6
    local NUM_SALE_SKLAD_2  = 6

    if(vNumMart == 1) then
        NUM_SALE_CRAZY    = 11
        NUM_SALE_OFFER    = 5
        NUM_SALE_PARROT   = 6
        NUM_SALE_ZAVOD    = 14
        NUM_SALE_SKLAD_2  = 8
    elseif(vNumMart == 2) then
        NUM_SALE_CRAZY    = 9
        NUM_SALE_OFFER    = 4
        NUM_SALE_PARROT   = 11
        NUM_SALE_ZAVOD    = 9
        NUM_SALE_SKLAD_2  = 7
    elseif(vNumMart == 3) then
        NUM_SALE_CRAZY    = 9
        NUM_SALE_OFFER    = 3
        NUM_SALE_PARROT   = 9
        NUM_SALE_ZAVOD    = 6
        NUM_SALE_SKLAD_2  = 6
    elseif(vNumMart == 4) then
        NUM_SALE_CRAZY    = 9
        NUM_SALE_OFFER    = 3
        NUM_SALE_PARROT   = 11
        NUM_SALE_ZAVOD    = 9
        NUM_SALE_SKLAD_2  = 7
    elseif(vNumMart == 5) then
        NUM_SALE_CRAZY    = 9
        NUM_SALE_OFFER    = 3
        NUM_SALE_PARROT   = 9
        NUM_SALE_ZAVOD    = 13
        NUM_SALE_SKLAD_2  = 6
    elseif(vNumMart == 6) then
        NUM_SALE_CRAZY    = 8
        NUM_SALE_OFFER    = 3
        NUM_SALE_PARROT   = 9
        NUM_SALE_ZAVOD    = 15
        NUM_SALE_SKLAD_2  = 7
    end

    return {
        NUM_SALE_CRAZY,
        NUM_SALE_OFFER,
        NUM_SALE_PARROT,
        NUM_SALE_ZAVOD,
        NUM_SALE_SKLAD_2
    }
end

function M.init_values()
    global.playingMusic     = ""
    global.selectedHat      = 0
    global.amount_gems      = 0
    global.numMarket        = 1
    global.s_ads_count      = 0
    global.s_playtime       = 0
    global.s_purchases      = 0
    global.quests           = {}
    global.tick_boosts      = {0,0,0,0}
    global.launch_date		= 0
    global.lastplay_date	= 0
    global.state_daily_gems     = 0
    global.cooldown_daily_gems  = 0
    global.state_daily_bonus    = 1
    global.isAllowBonus         = false

	
	global.maxSale1 = 17
	global.maxSale2 = 19
	global.maxSale3 = 19
	global.maxSale4 = 22
	global.maxSale5 = 20
	global.maxSale6 = 19

    global.have_hats = {
							{true,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0},
							{false,0},{false,0},{false,0}
						}

    M.init_mart(1)
    M.init_mart(2)
    M.init_mart(3)
    M.init_mart(4)
    M.init_mart(5)
    M.init_mart(6)
    M.init_mart('H')
    M.init_mart('C')

    

    
    global.pricePlaces1		= {
                                50,100,500,700,200,
                                200,100,150,200,250,
                                400,0,500,500,0,
                                700,800,1000,1200,1100,
                                1500,0,2000,3000,0,
                                400,1100,300,1000,2500,
                                0,4000
                            }

    global.upgrades_max1    = {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {0,0,3}
                            }

    global.upgrades_price1	= {
                                {{0,0,0},{'free',1000,2000},{0,0,0}},
                                {{700,1000,1400},{700,1000,1400},{700,1000,1400}},
                                {{200,300,400},{200,300,400},{200,300,400}},
                                {{600,800,1100},{600,800,1100},{600,800,1100}},
                                {{1500,2100,2900},{1500,2100,2900},{1500,2100,2900}},
                                {{300,400,600},{300,400,600},{300,400,600}},
                                {{400,600,800},{400,600,800},{400,600,800}},
                                {{900,1300,1800},{900,1300,1800},{900,1300,1800}},
                                {{1800,2500,3500},{1800,2500,3500},{1800,2500,3500}},
                                {{0,0,0},{0,0,0},{2000,3500,5000}}
                            }

    
    global.pricePlaces2		= {
                                0,5000,500,1700,800,
                                1450,3150,1600,0,650,
                                500,400,150,100,200,
                                200,250,550,750,400,
                                1100,450,400,1450,1800,
                                2150,1150,2150,800,1700,
                                1150,2650,2800,0,1050,
                                0,2200,0,1500,0,
                                3450,0,0
                            }

    global.upgrades_max2	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3}
                            }

    global.upgrades_price2	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{1000,1400,2000},{1000,1400,2000},{1000,1400,2000}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{900,1300,1800},{900,1300,1800},{900,1300,1800}},
                                {{1000,1400,2000},{1000,1400,2000},{1000,1400,2000}},
                                {{1900,2700,3800},{1900,2700,3800},{1900,2700,3800}},
                                {{600,800,1100},{600,800,1100},{600,800,1100}},
                                {{900,1300,1800},{900,1300,1800},{900,1300,1800}},
                                {{1300,1800,2500},{1300,1800,2500},{1300,1800,2500}},
                                {{1700,2400,3400},{1700,2400,3400},{1700,2400,3400}},
                                {{2100,2900,4100},{2100,2900,4100},{2100,2900,4100}}
                            }

    
    global.pricePlaces3		= {
                                0,6000,600,0,500,
                                1200,2400,1150,2050,2150,
                                100,150,400,500,650,
                                750,900,1000,1150,0,
                                1000,0,1500,0,1450,
                                0,600,0,2650,4050,
                                0,0,3300,0,0,
                                750,1550,200,3100,1150,
                                450,2000,2550,2000
                            }

    global.upgrades_max3	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {0,2,3}
                            }

    global.upgrades_price3	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{300,400,600},{300,400,600},{300,400,600}},
                                {{700,1000,1400},{700,1000,1400},{700,1000,1400}},
                                {{1400,2000,2800},{1400,2000,2800},{1400,2000,2800}},
                                {{700,1000,1400},{700,1000,1400},{700,1000,1400}},
                                {{1200,1700,2400},{1200,1700,2400},{1200,1700,2400}},
                                {{1300,1800,2500},{1300,1800,2500},{1300,1800,2500}},
                                {{600,800,1100},{600,800,1100},{600,800,1100}},
                                {{900,1300,1800},{900,1300,1800},{900,1300,1800}},
                                {{2400,3400,4800},{2400,3400,4800},{2400,3400,4800}},
                                {{900,1300,1800},{900,1300,1800},{900,1300,1800}},
                                {{400,600,800},{400,600,800},{400,600,800}},
                                {{1200,1700,2400},{1200,1700,2400},{1200,1700,2400}},
                                {{2000,2800,3900},{2000,2800,3900},{2000,2800,3900}},
                                {{1200,1700,2400},{1200,1700,2400},{1200,1700,2400}}
                            }

    
    global.pricePlaces4		= {
                                0,7000,700,0,1750,
                                650,3950,2550,5150,450,
                                500,1250,1400,200,250,
                                600,500,100,150,400,
                                500,650,750,900,1000,
                                1150,1300,1400,1550,200,
                                1000,4300,3600,700,750,
                                1800,2350,2950,3550,2100,
                                2950,0,1250,5600,0,
                                0,4700,0,0,0,
                                3850
                            }

    global.upgrades_max4	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3}
                            }

    global.upgrades_price4	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{1100,1500,2100},{1100,1500,2100},{1100,1500,2100}},
                                {{400,600,800},{400,600,800},{400,600,800}},
                                {{2400,3400,4800},{2400,3400,4800},{2400,3400,4800}},
                                {{1500,2100,2900},{1500,2100,2900},{1500,2100,2900}},
                                {{3100,4300,6000},{3100,4300,6000},{3100,4300,6000}},
                                {{800,1100,1500},{800,1100,1500},{800,1100,1500}},
                                {{2300,3200,4500},{2300,3200,4500},{2300,3200,4500}},
                                {{2800,3900,5500},{2800,3900,5500},{2800,3900,5500}},
                                {{3400,4800,6700},{3400,4800,6700},{3400,4800,6700}}
                            }

    
    global.pricePlaces5		= {
                                0,8000,0,800,750,
                                2350,3000,1350,3900,4000,
                                100,150,400,500,0,
                                2000,0,700,300,350,
                                900,1200,1500,1800,900,
                                1550,2100,200,550,2700,
                                4050,3350,0,2700,0,
                                3500,5300,0,0,0,
                                4350
                            }

    global.upgrades_max5	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3}
                            }

    global.upgrades_price5	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{1400,2000,2800},{1400,2000,2800},{1400,2000,2800}},
                                {{1800,2500,3500},{1800,2500,3500},{1800,2500,3500}},
                                {{800,1100,1500},{800,1100,1500},{800,1100,1500}},
                                {{2300,3200,4500},{2300,3200,4500},{2300,3200,4500}},
                                {{2400,3400,4800},{2400,3400,4800},{2400,3400,4800}},
                                {{1200,1700,2400},{1200,1700,2400},{1200,1700,2400}},
                                {{1600,2200,3100},{1600,2200,3100},{1600,2200,3100}},
                                {{400,600,800},{400,600,800},{400,600,800}},
                                {{2100,2900,4100},{2100,2900,4100},{2100,2900,4100}},
                                {{3200,4500,6300},{3200,4500,6300},{3200,4500,6300}},
                                {{2600,3600,5000},{2600,3600,5000},{2600,3600,5000}}
                            }

    
    global.pricePlaces6		= {
                                0,9000,900,0,900,
                                2650,4350,4050,5700,100,
                                150,400,800,850,2050,
                                2750,400,450,1050,1400,
                                200,250,650,850,200,
                                1900,2500,1150,550,3550,
                                4350,5200,0,2450,0,
                                4600,0,5650,6750,0,
                                0
                            }

    global.upgrades_max6	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3},
                                {3,2,3}
                            }

    global.upgrades_price6	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{1600,2200,3100},{1600,2200,3100},{1600,2200,3100}},
                                {{2600,3600,5000},{2600,3600,5000},{2600,3600,5000}},
                                {{2400,3400,4800},{2400,3400,4800},{2400,3400,4800}},
                                {{3400,4800,6700},{3400,4800,6700},{3400,4800,6700}},
                                {{1500,2100,2900},{1500,2100,2900},{1500,2100,2900}},
                                {{2800,3900,5500},{2800,3900,5500},{2800,3900,5500}},
                                {{3400,4800,6700},{3400,4800,6700},{3400,4800,6700}},
                                {{4100,5700,8000},{4100,5700,8000},{4100,5700,8000}}
                            }               

    
    global.pricePlacesH		= {
                                100,500,0,600,100,			
                                150,300,600,900,1200,		
                                800,1000,1200,1400,1600,	
                                1800,200,1200,2500,0,		
                                3500                        
                            }

    global.upgrades_maxH	= {
                                {0,3,0},
                                {3,3,3},
                                {3,2,3}
                            }

    global.upgrades_priceH	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{2000,2700,3700},{2000,2700,3700},{2000,2700,3700}}
                            }
    
    global.pricePlacesC		= {
                                100,500,600,4000,5000,      
                                0,100,150,300,600,          
                                900,1200,1500,1800,200,     
                                5000,3000,1200,0,6000,      
                                0,2000,4000                 
                            }

    global.upgrades_maxC	= {
                                {0,3,0},
                                {3,3,3},
                                {3,3,3},
                                {3,3,3},
                                {3,2,3},
                                {3,2,3},
                                {0,2,3}
                            }

    global.upgrades_priceC	= {
                                {{0,0,0},{0,0,0},{0,0,0}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{500,700,1000},{500,700,1000},{500,700,1000}},
                                {{2000,2700,3700},{2000,2700,3700},{2000,2700,3700}},
                                {{2000,2700,3700},{2000,2700,3700},{2000,2700,3700}},
                                {{2000,2700,3700},{2000,2700,3700},{2000,2700,3700}}
                            }

end

function M.get_start_coins(num, listSalesMain, id_places)
    local amount = 0
    local price = 0
    local pricePlaces = global["pricePlaces"..num]

    if (#listSalesMain < 3) then
        lume.trace('[ WARNING ] missing listSalesMain, return get_start_coins = 0')
        return 0
    end

    for k,v in pairs(id_places) do
        if (pricePlaces[listSalesMain[v]]) then
            price = pricePlaces[listSalesMain[v]]
            amount = amount + price
        end
    end

    return amount
end

function M.getProgressMart(num) 
    local progress = 0
    local countPlaces_max = 0
    local countPlaces_now = 0
    local countUpgrades_max = 0
    local countUpgrades_now = 0

    local get_pricePlaces = nil
    local get_have_places = nil
    local get_upgrades_max = nil
    local get_upgrades_level = nil

    if (num == 1) then
        countPlaces_max = 27
        countUpgrades_max = 68
        countPlaces_now = 0
        countUpgrades_now = 0

        get_pricePlaces = global.pricePlaces1
        get_have_places = global.have_places1
        get_upgrades_max = global.upgrades_max1
        get_upgrades_level = global.upgrades_level1

    elseif (num == 2) then
        countPlaces_max = 37
        countUpgrades_max = 88
        countPlaces_now = 0
        countUpgrades_now = 0

        get_pricePlaces = global.pricePlaces2
        get_have_places = global.have_places2
        get_upgrades_max = global.upgrades_max2
        get_upgrades_level = global.upgrades_level2

    elseif (num == 3) then
        countPlaces_max = 33
        countUpgrades_max = 115
        countPlaces_now = 0
        countUpgrades_now = 0

        get_pricePlaces = global.pricePlaces3
        get_have_places = global.have_places3
        get_upgrades_max = global.upgrades_max3
        get_upgrades_level = global.upgrades_level3

    elseif (num == 4) then
        countPlaces_max = 43
        countUpgrades_max = 77
        countPlaces_now = 0
        countUpgrades_now = 0

        get_pricePlaces = global.pricePlaces4
        get_have_places = global.have_places4
        get_upgrades_max = global.upgrades_max4
        get_upgrades_level = global.upgrades_level4

    elseif (num == 5) then

    end

    countPlaces_max = 0
    for i=1, #get_pricePlaces do
        if (get_pricePlaces[i] > 0) then
            countPlaces_max = countPlaces_max + 1
        end
    end

    countPlaces_now = 0
    for i=1, #get_have_places do
        if (get_have_places[i][1]) then
            countPlaces_now = countPlaces_now + 1
        end
    end

    countUpgrades_max = 0
    for i=1, #get_upgrades_max do
        if (i > 1) then
            for j=1,3 do
                countUpgrades_max = countUpgrades_max + get_upgrades_max[i][j]
            end

        end
    end

    countUpgrades_now = 0
    for i=2, 9 do
        for j=1,3 do
            countUpgrades_now = countUpgrades_now + (get_upgrades_level[i][j] - 1)
        end
    end

    
    
    
    
    
    

    local count_max = countPlaces_max + countUpgrades_max
    local count_now = countPlaces_now + countUpgrades_now
    progress = count_now/count_max

    return progress
end

function M.getDataHatByNum(vNum)
	for k,v in pairs(global.data_hats) do
		if (v.num == vNum) then
			return v, k
		end
	end

	return nil, -1
end

function M.getFrameNameZavod_normal(vNum)
    return global.foodZavodName[vNum].."1"
end

function M.getFrameNameZavod_mini(vNum)
    return global.foodZavodName[vNum].."2"
end

function M.setHaveHats(vIndex)
    global.have_hats[vIndex][1] = true

end

function M.isHaveManager()
    return (global.numMarket == 1) and (global.numSale1 < 12)
end

function M.set_cooldown_daily()
    local date_now = os.date("*t")
    local time_end = os.time(date_now) + TIME_CD_FREEGEMS
    global.cooldown_daily_gems = time_end

    

end

function M.get_remaining_time()
    local isNewDay = false
    local date_now = os.date("*t")
	local time_now = os.time(date_now)

    
    local new_day_seconds = global.lastplay_date - time_now

    if (new_day_seconds <= 0) then
		isNewDay = true
	end

    
	if global.isDebug then
        
		date_now.hour = date_now.hour + 1
		date_now.min = 0
		date_now.sec = 0

        
		
		
	else
		date_now.day = date_now.day + 1
		date_now.hour = 0
		date_now.min = 0
		date_now.sec = 0
	end

	local time_end = os.time(date_now)
	local remaining_seconds = time_end - time_now

    
    
    

    global.lastplay_date = time_end

    if isNewDay then
        quest_manager.reset()
        quest_manager.checkQuest('login')
        global.state_daily_gems = 0
        global.isAllowBonus = true

        lume.trace('!!! isNewDay !!!',isNewDay)

        if global.isPopupQuestsOpened then
            msg.post(url_popup_daily_quest, "update_buttons")
        end

        datamanager.update_saves()
    end

    return {
        remaining_seconds = remaining_seconds,
        time_now = time_now,
        time_end = time_end,
        isNewDay = isNewDay
    }

end

function M.check_daily_bonus(vIsTutorial, vDelay, vIsForce)
    local isAvailable = false
    local delay = 2.0

    lume.trace('global.state_daily_bonus',global.state_daily_bonus,'global.isAllowBonus',global.isAllowBonus)
    lume.trace('global.numSale1',global.numSale1)

    if (not vIsForce) and (global.numMarket == 1) and ((vIsTutorial) or (global.numSale1 < 14)) then
        return
    end

    if (global.numMarket > 100) then
        return
    end

    if vDelay then
        delay = vDelay
    end

    if (global.state_daily_bonus < 8) and (global.isAllowBonus) then
        isAvailable = true
    end

    lume.trace('check_daily_bonus',isAvailable)

    if isAvailable then
        timer.delay(delay, false, function()
            msg.post(url_screen_gui_game, "show_popup_bonus")
        end)

    end

end

function M.get_gems_to_coins()
    local numMarket = global.numMarket
    local numSale = global["numSale"..numMarket]
    local values = {0,0,0}

    if gameState.listSalesMain then
        local id_place = 1
        local countMax = #gameState.listSalesMain

        if (gameState.numSale == (countMax - 1)) then
            id_place = gameState.numSale
        elseif (gameState.numSale < countMax) then
            id_place = gameState.numSale + 1
        else
            id_place = gameState.numSale - 1
        end

        local price_offer = 0
        local price_next_place = 0

        for i = 1, id_place do
            price_next_place = gameState.dataMart.pricePlaces[gameState.listSalesMain[i]]
            
            if (price_next_place >= price_offer) then
                price_offer = price_next_place
            end

        end

        local amount1 = math.floor(price_offer * global.kf_coins_gems)
        local amount2 = amount1*5
        local amount3 = amount1*15

        values[1] = math.ceil(amount1 / 50) * 50
        values[2] = math.ceil(amount2 / 50) * 50
        values[3] = math.ceil(amount3 / 50) * 50

    end

    return values
end

function M.get_limit_event(vTimeStamp, vTestDay)
	local str = ""
	local max_day = vTimeStamp
	local time = os.difftime(max_day, vTestDay or os.time())

	if (time < 0) then
		return str
	end

	local days = math.floor(time/86400)
    local hours = math.floor(math.fmod(time, 86400)/3600)
    local minutes = math.floor(math.fmod(time,3600)/60)
    local seconds = math.floor(math.fmod(time,60))

	if (days > 0) then
		str = days.."d"..hours.."h"
	else
		if (hours > 0) then
			str = hours.."h"..minutes.."m"
		else
			str = minutes.."m"..seconds.."s"
		end
	end

	
	
	
	
	
	
	
	
	

	return str

end

return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
