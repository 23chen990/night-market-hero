require("main.gamecore.DataMart1")
require("main.gamecore.DataMart2")
require("main.gamecore.DataMart3")
require("main.gamecore.DataMart4")
require("main.gamecore.DataMart5")
require("main.gamecore.DataMart6")
require("main.gamecore.DataMartC")
require("main.gamecore.DataMartH")

local dataSklad = require("main.gamecore.DataSklad")

GameState = {}

local H_TOUCH	= hash("touch")
local H_UP		= hash("up")
local H_DOWN	= hash("down")
local H_LEFT	= hash("left")
local H_RIGHT	= hash("right")
local H_KEY_M	= hash("key_M")
local H_SHIFT	= hash("shift")
local H_CTRL	= hash("ctrl")
local H_SPACE	= hash("space")
local H_GAMEPAD_STICK_UP	= hash("gamepad_stick_up")
local H_GAMEPAD_STICK_DOWN	= hash("gamepad_stick_down")
local H_GAMEPAD_STICK_LEFT	= hash("gamepad_stick_left")
local H_GAMEPAD_STICK_RIGHT	= hash("gamepad_stick_right")

local DATA_MARTS = {}
DATA_MARTS[1] = DataMart1
DATA_MARTS[2] = DataMart2
DATA_MARTS[3] = DataMart3
DATA_MARTS[4] = DataMart4
DATA_MARTS[5] = DataMart5
DATA_MARTS[6] = DataMart6
DATA_MARTS[101] = DataMartH
DATA_MARTS[102] = DataMartC

function GameState:new()
	local this = {}

    function this:initSettingsGame()
		this.input 				= {}
		this.midScreen      	= vmath.vector3(0, 0, 0)
		this.localInput 		= vmath.vector3(0, 0, 0)
		this.inputGamepad		= vmath.vector3(0, 0, 0)

		this.currentMart		= nil
		this.isFirstInput		= false
		this.isGameStarted		= false
		this.gamePlayStarted	= false
		this.isTutorial			= false
		this.isHintTime			= false
		this.isHaveCashier		= false
		this.isCheckCashbox		= false
		this.isUpdateCoins		= false
		this.isNearCashbox		= false
		this.isCanCheckQueue	= true
		this.isAllowHooligan	= false
		this.isAllowNextMart	= false
		this.isAllowShowMart	= false
		this.isAllowShowDelivery	= true
		this.isBoostCoinsX2		= false
		this.isBoostWorkers		= false
		this.isBoostZavods		= false
		this.isBoostManager		= false
		this.isShowingOffer		= false
		this.isOfferShowed		= false
		this.isFunSquadAdded	= false
		this.isHaveWater		= false
		this.isBoughtCow		= false

		this.arrowDirectionPos	= nil
		this.stepTutorial		= 0
		this.tickSec			= 0
		this.tickLive			= TIME_MANAGER_WORK
		this.tickCrazy			= 0
		this.tickFunSquad		= 0
		this.tickNewOffer		= 10
		this.tickParrot			= 60
		this.tickAddDelivery	= 60 * 2
		this.tickMonkeyPunch	= TIME_MONKEY_PUNCH - 30
		this.tickAddBonus1		= 0
		this.tickAddBonus2		= 0
		this.swiftOffer			= 0
		this.swiftBonus			= 1 
		this.tickOfferFreeCash	= 0

		this.NUMPLACE_CAHSBOX	= 0
		this.NUMPLACE_NEXTMART	= 0

		this.players 			= {}
		this.entities 			= {}
		this.listBorders		= {}
		this.listZavodObjects	= {}
		this.listAnimalObjects	= {}
		this.listCrabs			= {}
		this.listObstacles		= {}
		this.listWater			= {}
		this.listLines			= {}
		this.listEffectObjects	= {}
		this.listDroppedObjects	= {}
		this.queueCashbox		= {}
		this.listAlert			= {}
		this.listHelpArrow		= {}
		this.listIndicators		= {}

		this.radiusSklad		= 20000
		this.radiusZavod		= 11000
		this.defaultStamina		= 8
		this.buildTimePlants	= 6
		this.buildTimeZavods	= 12

		this.placeNumForSale	= 0
		this.numSale			= 0
		this.amountCashBox		= 0
		this.countEffect		= 0

		this.count_seconds		= 0
		this.count_customer		= 0
		this.count_cash			= 0

		this.tap_times			= {}
		this.MAX_TAP_INTERVAL	= 0.4

    end

	function this:setDataMart(vNumMart)
		local dataMart			= DATA_MARTS[vNumMart]:init()

		this.posDodik			= dataMart.posDodik
		this.limitMoveX 		= dataMart.limitMoveX
		this.limitMoveY 		= dataMart.limitMoveY
		this.posStart 			= dataMart.posStart
		this.posManager 		= dataMart.posManager
		this.posGoldenPig 		= dataMart.posGoldenPig
		this.posDeliveryBoy 	= dataMart.posDeliveryBoy
		this.posNextMarket 		= dataMart.posNextMarket
		this.posTrash      		= dataMart.posTrash
		this.posBasket      	= dataMart.posBasket
		this.listSalesMain		= dataMart.listSalesMain
		this.pricePlaces		= dataMart.pricePlaces
		this.listPlaceBoxes		= dataMart.listPlaceBoxes

		this.dataMart = dataMart

		this.listWarehouses = {}
		this.listZavodIn = {}
		this.listZavodOut = {}

		for i, box in pairs(this.listPlaceBoxes) do
			box.id = i
			this.dataMart.PLACES[box.link] = box

			if (box.isSklad and box.isForBuyer) or (box.isWarehouse) then
				table.insert(this.listWarehouses, box.link)
			end

			if (box.isSklad and (not box.isForBuyer) and (box.link ~= 'placebox_cashbox')) then
				table.insert(this.listZavodIn, box.link)
			end

			if (box.isZavod and box.linkSklad) then
				table.insert(this.listZavodOut, box.link)
			end
		end

	end

	function this:updateCoins()
		msg.post(url_screen_gui_game, "update_money", {isForce = true})

	end

	function this:finishUpdateCoins()
		this.isCheckCashbox = false
		datamanager.update_saves()

		this:checkArrowHintDirection()

	end

	function this:setRewardedCoins()	
		local amount = this:getBankomatValue()
		amount = math.floor(amount * global.kf_coins_ads)

		if (global.numMarket > 100) then
			amount = math.floor(amount*0.1)
		end

		amount = math.ceil(amount / 10) * 10

		return amount
	end

	function this:addRewardedCoins(vValue)
		msg.post(url_popup_message, "showRewardedCoins", {value = vValue})

		timer.delay(1.0, false, function()
			coinmanager.plus_balance(vValue)
		end)

	end

	function this:addRewardedGems()
		msg.post(url_popup_message, "showRewardedCoins", {value = global.rewardedGems, isGems = true})

		timer.delay(1.0, false, function()
			coinmanager.plus_balance(global.rewardedGems, 'gems')
			msg.post(url_screen_gui_game, "update_gems")

			datamanager.update_saves()

		end)

	end

	function this:updateLanguage()
		local str_value = 2 .. ' ' .. translate("MINUTES_SHORT")
		msg.post(this.indicatorSpeedBoots.view, "update_text", { value = str_value } )

	end

	function this:sendLiveTick()
		if html5 then
			local domain = html5.run("window.location.hostname")

			if (domain ~= "tinydobbins.com") then
				html5.run("navigator.sendBeacon('https://leveldata.poki.io/stores', '1183520a-1ec4-4f33-a7ce-7673c60f912c')")
			end
		end

	end

	function this:showHint(vBool, vId, vType, vPos, vOffsetY)
		vOffsetY = vOffsetY or 200

		if vType == 'arrow' then
			if vBool then
				if (not this.listHelpArrow[vId]) then

					local help_arrow = addGraphic({layer="top",sprite="tutorial_arrow", x=vPos.x, y=vPos.y + vOffsetY, z=DEEP_CLOUD})
					msg.post(help_arrow,"setWaveEffect", {offset = 10, duration = 0.5})

					this.listHelpArrow[vId] = {
						isAlive = true,
						view = help_arrow
					}

				end
			else
				if (this.listHelpArrow[vId]) and this.listHelpArrow[vId].isAlive then
					msg.post(this.listHelpArrow[vId].view, "remove")
					this.listHelpArrow[vId].isAlive = false

					
				end
			end
		end

	end

	function this:indexOfLastValueId(t, object)
		local len = #t

		for i = len, 1, -1 do
			if object == t[i].t then
				return i
			end
		end
		return -1

	end

	function this:updateAlert(vIsAdd, vData)
		local vType = vData.t

		if vIsAdd then
			if vType == 'place' then
				table.insert(this.listAlert, vData)
			else
				table.insert(this.listAlert, 1, vData)
			end
		else
			local index = this:indexOfLastValueId(this.listAlert, vType)

			if (index > 0) then
				table.remove(this.listAlert, index)
			end
		end

		msg.post(url_screen_gui_game, "updateAlert", {list = this.listAlert})

	end

	function this:timeForOffer(vTypeOffer)
		if global.isCommercialBreak or global.isRewardBreak then
			lume.trace('[ WARNING ] timeForOffer cancel - commercial_break / rewardbreak already!')
			return
		end

		if this.isShowingOffer then
			lume.trace('[ WARNING ] timeForOffer cancel - isShowingOffer already!')
			return
		end

		if (config.isMobileTrue) then
			local is_ready = true

			is_ready = apimanager.is_rewarded_ready()

			if (not global.isNetworkConnected) or (not is_ready) then
				return
			end
		end

		if vTypeOffer and (vTypeOffer == 'boost_fillWarehouse') then
			typeOffer = vTypeOffer

			
			msg.post(url_screen_gui_game, "setWindowOffer", {visible = true, type = typeOffer})

			this.timerBoostHide = timer.delay(TIME_HIDE_OFFER, false, function()
				this:finishOfferBoost()
			end)

			this.isShowingOffer = true
			this.isOfferShowed = false

			return
		end

		this.swiftOffer = this.swiftOffer + 1

		if (this.swiftOffer > 4) then
			this.swiftOffer = 1
		end

		local typeOffer = global.listOffers[this.swiftOffer]

		if vTypeOffer then
			typeOffer = vTypeOffer
		end

		local isHaveZavod = false
		local isHaveWorker = false

		if (this.dataMart.NUMPLACE_ZAVOD > 0) then
			isHaveZavod = this.listPlaceBoxes[this.dataMart.NUMPLACE_ZAVOD].isActive
		end

		local player = nil
		for k,v in pairs(this.players) do
			player = this.players[k]
			if player.isAlive and (player.roleType == ROLE_STOCKMAN) then
				isHaveWorker = true
			end
		end

		if (typeOffer == "boost_coinsX2") and (this.isBoostCoinsX2) then
			this.swiftOffer = this.swiftOffer + 1
			typeOffer = global.listOffers[this.swiftOffer]
		end
		if (typeOffer == "boost_energyWork") and ((this.isBoostWorkers) or (not isHaveWorker)) then
			this.swiftOffer = this.swiftOffer + 1
			typeOffer = global.listOffers[this.swiftOffer]
		end
		if (typeOffer == "boost_energyZavod") and ((this.isBoostZavods) or (not isHaveZavod)) then
			this.swiftOffer = this.swiftOffer + 1
			typeOffer = global.listOffers[this.swiftOffer]
		end

		if (this.swiftOffer > 4) then
			this.swiftOffer = 1
			typeOffer = global.listOffers[this.swiftOffer]
		end

		if typeOffer == "boost_bankomat" then 
			global.amount_ads = this:getBankomatCoins(global.kf_coins_rewarded)

		end

		msg.post(url_screen_gui_game, "setWindowOffer", {visible = true, type = typeOffer})

		this.timerBoostHide = timer.delay(TIME_HIDE_OFFER, false, function()
			this:finishOfferBoost()
		end)

		this.isShowingOffer = true
		this.isOfferShowed = true

	end


	function this:showAdsForOffer()
		if global.isAdBlocked then
			
			return
		end

		if global.isCommercialBreak or global.isRewardBreak then
			lume.trace('[ WARNING ] commercial_break / rewardbreak already!')
	        return
		end

		local vTypeOffer = global.typeOffer
		local numMarket = global.numMarket

		if vTypeOffer == "boost_bankomat" then
			msg.post(url_controller, "showAds", {
				type = 'boost_bankomat',
				category = 'direct-coin-unlock',
				details = 'mart-'..numMarket,
				placement = 'gameplay'
			})

			this.tickOfferFreeCash = TIME_FREE_CASH

		elseif vTypeOffer == "boost_pig" then
			msg.post(url_controller, "showAds", {
				type = 'boost_pig',
				category = 'direct-coin-unlock',
				details = 'mart-'..global.numMarket,
				placement = 'gameplay'
			})

		elseif vTypeOffer == "delivery_x3" then
			msg.post(url_controller, "showAds", {
				type = 'delivery_x3',
				category = 'direct-coin-unlock',
				details = 'mart-'..global.numMarket,
				placement = 'gameplay'
			})

		elseif vTypeOffer == "boost_coinsX2" then
			msg.post(url_controller, "showAds", {
				type = 'boost_coinsX2',
				category = 'multiply-reward',
				details = 'mart-'..numMarket,
				placement = 'gameplay'
			})
		elseif vTypeOffer == "boost_energyWork" then
			msg.post(url_controller, "showAds", {
				type = 'boost_energyWork',
				category = 'stat-boost',
				details = 'mart-'..numMarket..'-assistants',
				placement = 'gameplay'
			})
		elseif vTypeOffer == "boost_energyZavod" then
			msg.post(url_controller, "showAds", {
				type = 'boost_energyZavod',
				category = 'stat-boost',
				details = 'mart-'..numMarket..'-applicance',
				placement = 'gameplay'
			})
		elseif vTypeOffer == "boost_manager" then
			msg.post(url_controller, "showAds", {
				type = 'boost_manager',
				category = 'feature-unlock',
				details = 'mart-'..numMarket,
				placement = 'gameplay'
			})
		elseif vTypeOffer == "free_gems" then
			msg.post(url_controller, "showAds", {
				type = 'free_gems',
				index = global.state_daily_gems,
				category = 'direct-gems-unlock',
				details = 'mart-'..numMarket,
				placement = 'shop'
			})
		elseif vTypeOffer == "hats" then
			msg.post(url_controller, "showAds", {
				type = 'hats',
				index = global.rewardedHat,
				category = 'cosmetic',
				details = 'mart-'..numMarket,
				placement = 'shop'
			})
		elseif vTypeOffer == "boost_boots" then
			msg.post(url_controller, "showAds", {
				type = vTypeOffer,
				category = 'stat-boost',
				details = 'mart-'..numMarket..'-assistants',
				placement = 'gameplay'
			})

		elseif vTypeOffer == "boost_fillWarehouse" then
			msg.post(url_controller, "showAds", {
				type = vTypeOffer,
				category = 'stat-boost',
				details = 'mart-'..numMarket..'-assistants',
				placement = 'gameplay'
			})

		end

	end

	function this:hideOffer(vTypeBoost)
		this:finishOfferBoost()

		if (global.typeOffer == "boost_manager") and (not gameState.isBoostManager) then
			gameState.indicatorM.isReady = true
		end

	end

	
	function this:initHelpCamera()
		local image = addGraphic({sprite="debug_point",x=0, y=0, z=DEEP_OBJECTS})
		msg.post(image, "hide")

		this.cameraHelp = image

	end

	function this:stopMovement()
		this.input = {}

		this.localInput.x = 0
		this.localInput.y = 0

		local player = gameState.players[this.controlId]

		if player then
			player:applyMoveInput(vmath.vector3(0,0,0), true)
		end

		msg.post(url_gamepad_gui, "do_untouch")

	end

	function this:moveCamera(posX, posY, delay)
		local player = gameState.players[this.controlId]
		if player then
		player:applyMoveInput(vmath.vector3(0,0,0), true)
		this.controlId = nil

		msg.post(this.cameraHelp,"setPosition",
		{
			x = posX,
			y = posY,
			z = DEEP_OBJECTS
		})

		setCamera("follow", this.cameraHelp, 0.1)

		timer.delay(delay, false, function()
			this.controlId = this.ourPlayer.id

			setCamera("follow", this.players[this.controlId].view, 0.1)

			timer.delay(0.4, false, function()
				if this.players[this.controlId] then
					setCamera("follow", this.players[this.controlId].view)
				end
			end)

			global.isCameraMoving = false

		end)
		end

		global.isCameraMoving = true

	end

	function this:followCameraPlace(placeNum)
		local box = this.listPlaceBoxes[placeNum]

		if box == nil then
			return
		end

		local offsetBuy = vmath.vector3(0, 0, 0)

		if box.offsetBuy then
			offsetBuy.x = box.offsetBuy.x
			offsetBuy.y = box.offsetBuy.y
		end

		local point = vmath.vector3(box.x + offsetBuy.x, box.y + offsetBuy.y, 0)

		timer.delay(0.6, false, function()
			this:moveCamera(point.x, point.y, 1.5)
		end)
	end

	function this:followCameraPoint(vX, vY, vDelay)
		local point = vmath.vector3(vX, vY, 0)

		local time_delay = vDelay or 0.6

		timer.delay(time_delay, false, function()
			this:moveCamera(point.x, point.y, 1.5)
		end)
	end

	

    function this:getPosZ(posY)
		return DEEP_PLAYERS - posY / 10000
	end

    function this:initPath()
		local world	= this.dataMart.world
		local map_width = this.dataMart.map_width
		local map_height = this.dataMart.map_height

		local costs1 = {
		    [1] = {
		        1.0, 
		        1.0, 
		        1.0, 
		        1.0, 
		        1.41, 
		        1.41, 
		        1.41, 
		        1.41 
		    },
			[2] = {
				1.0, 
				1.0, 
				1.0, 
				1.0, 
				1.41, 
				1.41, 
				1.41, 
				1.41 
			}
		}

		local costs2 = {
			[1] = {
				1.0, 
				1.0, 
				1.0, 
				1.0, 
				1.41, 
				1.41, 
				1.41, 
				1.41 
			},
			[2] = {
				1.0, 
				1.0, 
				1.0, 
				1.0, 
				1.41, 
				1.41, 
				1.41, 
				1.41 
			},
			[5] = {
				1.0, 
				1.0, 
				1.0, 
				1.0, 
				1.41, 
				1.41, 
				1.41, 
				1.41 
			}
		}

		local direction = astar.DIRECTION_EIGHT
		local allocate = map_width * map_height
		local typical_adjacent = 8
		local cache = false

		astar.setup(map_width, map_height, direction, allocate, typical_adjacent, cache)
		astar.set_map(world)
		astar.set_costs(costs1)

		this.debugGrid = {}

		this.world = world
		this.costs1 = costs1
		this.costs2 = costs2

	end

	function this:updateMap(vPlaceBoxId)
		local indexes = this.dataMart:getIndexes(vPlaceBoxId)

		if #indexes > 0 then
			for k,v in pairs(indexes) do
				this.world[v] = 0
			end
		end

		astar.set_map(this.world)

	end

    function this:findPath(startPos, endPos)
		local result, size, total_cost, path = astar.solve(startPos.x, startPos.y, endPos.x, endPos.y)

		if result == astar.SOLVED then
			
			
			
			

			return path
		elseif result == astar.NO_SOLUTION then
			
		elseif result == astar.START_END_SAME then
			
		end


	end

	function this:followPoint(vPlayer, vX, vY)	
		if (vPlayer.roleType == ROLE_BUYER) or (vPlayer.roleType == ROLE_ROWDY) then
			astar.set_costs(this.costs1)
		else
			astar.set_costs(this.costs2)
		end

		local startPos	= this:getTileFromPos(vPlayer.pos.x, vPlayer.pos.y)
		local finishPos	= this:getTileFromPos(vX, vY)
		local path		= this:findPath(startPos, finishPos)

		if path then
			vPlayer:followPath(path)
		end

	end

	function this:followTile(vPlayer, vX, vY)
		if (global.numMarket == 5) then
			if (vPlayer.roleType == ROLE_BUYER) or (vPlayer.roleType == ROLE_ROWDY) then
				astar.set_costs(this.costs1)
			else
				astar.set_costs(this.costs2)
			end
		end

		local startPos	= this:getTileFromPos(vPlayer.pos.x, vPlayer.pos.y)
		local finishPos	= vmath.vector3(vX, vY, 0)
		local path		= this:findPath(startPos, finishPos)

		if path then
			vPlayer:followPath(path)
		end

	end

	function this:followTileCrab(vStartPos, vFinishTile)
		astar.set_costs(this.costs1)

		local startTile = this:getTileFromPos(vStartPos.x, vStartPos.y)
		local path = this:findPath(startTile, vFinishTile)

		return path
	end

	function this:getTileFromPos(vX, vY)
		local pos =  vmath.vector3(0, 0, 0)
		local ceilW = CELL_SIZE
		local deltaX = 17
		local deltaY = 9

		

		
		if (global.numMarket == 4) then
			deltaX = 17 + 1
			deltaY = 9 + 3
		elseif (global.numMarket == 5) then
			deltaX = 17 - 4
			deltaY = 9 + 4
		elseif (global.numMarket == 6) then
			deltaX = 17 - 1
			deltaY = 9 + 5
		end

		local tileX = deltaX + math.floor(vX/CELL_SIZE)
		local tileY = deltaY + math.floor((vY-(CELL_SIZE*0.5))/CELL_SIZE)

		if global.isShowTiles then
			lume.trace('tile', tileX, tileY)
		end

		pos.x = tileX
		pos.y = tileY

		return pos
	end

	function this:getPosFromTile(vX, vY)
		local pos = vmath.vector3(0, 0, 0)
		local offset = vmath.vector3(-1300, -600, 0)

		
		if (global.numMarket == 4) then
			offset.x = -1300 - 1*CELL_SIZE
			offset.y = -600 - 3*CELL_SIZE
		elseif (global.numMarket == 5) then
			offset.x = -1300 + 4*CELL_SIZE
			offset.y = -600 - 4*CELL_SIZE
		elseif (global.numMarket == 6) then
			offset.x = -1300 + 1*CELL_SIZE
			offset.y = -600 - 5*CELL_SIZE
		end

		pos.x = offset.x + vX * CELL_SIZE
		pos.y = offset.y + vY * CELL_SIZE - CELL_SIZE * 0.5
		return pos

	end

	function this:showDebugCellType3()
		if global.isShowTiles then
			local indexes = {}

			for i,v in pairs(this.world) do
				if v == 3 then	
					table.insert(indexes, i)
				end
			end

			if #indexes > 0 then
				local str = ''
				for k,v in pairs(indexes) do
					str = str .. v .. ','
				end
				print('')
				print('indexes = {'..str..'}')
				print('')
			end

		end

	end

	function this:addDebugCell(i, vType)
		local map_width = this.dataMart.map_width
		local map_height = this.dataMart.map_height
		local pY = math.floor(i / map_width)
		local pX = math.floor(i - pY * map_width)

		local p = this:getPosFromTile(pX, pY)
		local image = addGraphic({sprite="debug_point",x=p.x-CELL_SIZE-20, y=p.y, z=DEEP_EFFECT})
		msg.post(image, "updateScale", {value = 2.0})

		if (vType == 0) then
			msg.post(image, "updateTint", {color = '#00FF00'})
		elseif (vType == 5) then
			msg.post(image, "updateTint", {color = '#FFFF00'})
		else
			msg.post(image, "updateTint", {color = '#FF0000'})
		end

		return image
	end

	function this:showDebugTile(vTile)
		local p = this:getPosFromTile(vTile.x, vTile.y)
		local image = addGraphic({sprite="debug_point",x=p.x-20, y=p.y, z=DEEP_EFFECT})
		msg.post(image, "updateScale", {value = 2.0})
		msg.post(image, "updateTint", {color = '#000000'})

	end

	function this:updateDebugGridCell(vX, vY, vType)
		local tile = this:getTileFromPos(vX, vY)

		local map_width = this.dataMart.map_width
		local map_height = this.dataMart.map_height

		local num = tile.x + (tile.y * map_width)

		local value = this.world[num + 1]

		if (value == 1) then
			this.world[num + 1] = vType
		else
			this.world[num + 1] = 1
		end

		this:updateDebugEditorGrid()
		astar.set_map(this.world)

	end

	function this:updateDebugEditorGrid()
		if not global.isShowTiles then
			return
		end

		if (#this.debugGrid > 0) then
			for k,v in pairs(this.debugGrid) do
				go.delete(v)
			end
		end

		this.debugGrid = {}

		local image = nil
		local world	= this.dataMart.world

		for i,v in pairs(world) do
			if (v == 0) or (v == 3) or (v == 5) then
				image = this:addDebugCell(i, v)
				table.insert(this.debugGrid, image)
			end
		end

	end

	function this:traceEditorMap()
		local map_width = this.dataMart.map_width
		local map_height = this.dataMart.map_height
		local pX = 0
		local pY = 0
		local listMap = {}
		local count1 = 1
		local count2 = 1

		for i=1,map_height do
			table.insert(listMap, {})
		end

		local str = ''

		lume.trace('traceEditorMap')

		for k,v in pairs(this.world) do
			str = str .. v ..','

			count2 = count2 + 1

			if count2 > map_width then
				table.insert(listMap[count1], str)
				print(10000+count1,' | ',str)
				count1 = count1 + 1
				count2 = 1
				str = ''
			end
		end

	end

    function this:addPlayer(vId, vX, vY, vData)
		local player = Player:new(vX, vY)
		this.players[vId] = player

		local newDodik = addFactorySpine({factoryName='#factoryDodik',x=vX, y=vY, z=DEEP_PLAYERS})
		player.view		= newDodik.root
		player.is_bot	= vData.is_bot

		player:init(vId, vData.role)
		player:updatePosition({x=vX, y=vY})
		player:updateMovement(true)
		player:updateSkin(vData.skin)

		return player
	end

	function this:addDodikDecor(vX, vY, vData)
		local newDodik = addFactorySpine({factoryName='#factoryDodik',x=vX, y=vY, z=DEEP_PLAYERS})
		local object = newDodik.root

		msg.post(object, "randomCursor", { value = math.random()} )
		msg.post(object, "playAnim", { name = "idle1", loop = true})
		msg.post(object, "updateView", { skin = vData.skin, hat = vData.hat })

		return object
	end

	function this:addToyPunch(vX, vY)
		local posZ = vZ or this:getPosZ(vY)
		local newDodik = addFactorySpine({factoryName='#factoryToyPunch',x=vX, y=vY, z=posZ})
		local object = newDodik.root

		msg.post(object, "randomCursor", { value = math.random()} )

		return object
	end

	

	function this:getSafePointOnCircle(center, radius, boxes, min_dist, max_attempts)
		

		local radius_start = radius
		
		for attempt = 1, max_attempts do
			if (attempt > 5) then
				radius = radius_start + (attempt - 5) * 10
			end

			local p = utils.getRandomPointOnCircle(center, radius)
			local is_safe = true

			
			
			for _, box in pairs(boxes) do
				local dist = lume.distance(p.x, p.y, box.x, box.y, true)

				if dist < min_dist then
					is_safe = false
					break
				end

				if (dist < 90000) and box.isActive and box.listHitBox then
					local value = this:checkInsidePlace('bonus', p, box.id)

					if value then
						is_safe = false
						break
					end
				end
			end

			for k,indicator in pairs(this.listIndicators) do
				local dist = lume.distance(p.x, p.y, indicator.pos.x, indicator.pos.y, true)

				if dist < min_dist then
					is_safe = false
					break
				end
			end

			if this.indicatorPig.isReady then
				local pos = this.posGoldenPig
				local dist = lume.distance(p.x, p.y, pos.x, pos.y, true)
				if dist < min_dist then
					is_safe = false
				end
			end

			if this.indicatorSpeedBoots.isReady then
				local pos = this.posSpeedBoots
				local dist = lume.distance(p.x, p.y, pos.x, pos.y, true)
				if dist < min_dist then
					is_safe = false
				end
			end

			if is_safe then
				return p
			end
		end

		return utils.getRandomPointOnCircle(center, 50)
	end


	function this:addBonus(vTypeBonus)
		local p = this:getSafePointOnCircle(this.ourPlayer.pos, 140, this.listPlaceBoxes, 12000, 10)

		local isInside, pointNew = this:checkCrabPoint(p)
			
		if(isInside) then
			p = vmath.vector3(pointNew.x, pointNew.y, 0)
		end

		if (vTypeBonus == 'GoldenPig') then
			this:activateGoldenPig(true, p)
		elseif (vTypeBonus == 'SpeedBoots') then
			this:activateSpeedBoots(true, p)
		end

	end

	

	function this:initGoldenPig()
		local pos = this.dataMart.posGoldenPig

		local object = addIndicatorCoins(
			{
				x = pos.x,
				y = pos.y + 125,
				z = DEEP_CLOUD
			})

		msg.post(object, "updateCoins", { type_bonus = 'boost_pig', value = global.amount_golden_pig} )

		local goldenPig = this:addDecorObject('bonus_piggy', pos, 30)

		local effectBoostPig = this:addBoostEffects(vmath.vector3(pos.x-6, pos.y+40, 0), 60)

		msg.post(effectBoostPig, "setScale", {value = 2.2})

		this.indicatorPig = {
			tick	= 1,
			tickMax	= global.timeIndicator,
			tickStep = 1,
			isReady	= false,
			isNear	= false,
			view	= object,
			pig		= goldenPig,
			effect	= effectBoostPig
		}

		msg.post(this.indicatorPig.pig, "hide")

	end

	function this:timeToCallGoldenPig()
		if (config.isMobileTrue) and (not global.isNetworkConnected) then
			msg.post(url_popup_message, "show_message", {text_id = "NETWORK_DISCONNECTED"})
			return
		end

		if global.isAdBlocked then
			

		else
			global.typeOffer = 'boost_pig'

			if global.isMobileTrue then
				msg.post(url_popup_watch, "popup", {
					owner_url = msg.url()
				})
				gameState:stopMovement()

				global.isPopupOpened = true

			else
				gameState:showAdsForOffer()
			end

		end

		this:activateGoldenPig(false)

	end

	function this:updateIndicatorGoldenPig()
		if (this.indicatorPig == nil) then
			return
		end
		if global.isPopupOpened or global.isConfirmOpened or global.isCameraMoving or (not this.ourPlayer.inputAllowed) or (not this.indicatorPig.isReady) then
			return
		end

		if this.indicatorPig.isNear then
			this.indicatorPig.tick = this.indicatorPig.tick + 1

			if this.indicatorPig.tick > this.indicatorPig.tickMax then
				this:timeToCallGoldenPig()

				this.indicatorPig.tick = 1

			end

		else
			if this.indicatorPig.tick > 1 then
				this.indicatorPig.tick = this.indicatorPig.tick - 1
			end
		end

	end

	function this:activateGoldenPig(vBool, vNewPoint)
		if vBool then
			msg.post(this.indicatorPig.pig, "show")
			msg.post(this.indicatorPig.effect, "updateVisible", { value = true} )
			msg.post(this.indicatorPig.view, "setVisible", { value = true} )

			if vNewPoint then
				this.posGoldenPig.x = vNewPoint.x
				this.posGoldenPig.y = vNewPoint.y
				local pos_z1 = this:getPosZ(vNewPoint.y)
				local pos_z2 = this:getPosZ(vNewPoint.y - 10)

				msg.post(this.indicatorPig.pig,"setPosition",{x = vNewPoint.x, y = vNewPoint.y + 30, z = pos_z1})
				msg.post(this.indicatorPig.effect,"setPosition",{x = vNewPoint.x-6, y = vNewPoint.y+40, z = pos_z2})
				msg.post(this.indicatorPig.view,"setPosition",{x = vNewPoint.x, y = vNewPoint.y + 125, z = DEEP_CLOUD})

			end

			global.amount_golden_pig = this:getBankomatCoins(global.kf_coins_gold_pig)
			msg.post(this.indicatorPig.view, "updateCoins", { type_bonus = 'boost_pig', value = global.amount_golden_pig} )

		else
			msg.post(this.indicatorPig.pig, "hide")
			msg.post(this.indicatorPig.view, "setVisible", {value = false})
			msg.post(this.indicatorPig.effect, "updateVisible", { value = false} )

		end

		this.indicatorPig.tick = 1
		this.indicatorPig.isReady = vBool

	end

	

	function this:initSpeedBoots()
		this.posSpeedBoots = vmath.vector3(-220, 105, 0)

		local pos = this.posSpeedBoots

		local object = addIndicatorCoins(
			{
				x = pos.x,
				y = pos.y + 125,
				z = DEEP_CLOUD
			})

		local str_value = 2 .. ' ' .. translate("MINUTES_SHORT")
		msg.post(object, "setSpeedBoots", { type_bonus = 'boost_boots', value = str_value } )

		local object_bonus = this:addDecorObject('bonus_boots', pos, 20)

		local effectBoost = this:addBoostEffects(vmath.vector3(pos.x-6, pos.y+40, 0), 60)

		msg.post(effectBoost, "setScale", {value = 2.2})

		this.indicatorSpeedBoots = {
			tick	= 1,
			tickMax	= global.timeIndicator,
			tickStep = 1,
			isReady	= false,
			isNear	= false,
			view	= object,
			root	= object_bonus,
			effect	= effectBoost
		}

		msg.post(this.indicatorSpeedBoots.root, "hide")
			
	end

	function this:timeToCallSpeedBoots()
		if (config.isMobileTrue) and (not global.isNetworkConnected) then
			msg.post(url_popup_message, "show_message", {text_id = "NETWORK_DISCONNECTED"})
			return
		end

		if global.isAdBlocked then
			

		else
			global.typeOffer = 'boost_boots'

			if global.isMobileTrue then
				msg.post(url_popup_watch, "popup", {
					owner_url = msg.url()
				})
				gameState:stopMovement()

				global.isPopupOpened = true

			else
				gameState:showAdsForOffer()
			end

		end

		this:activateSpeedBoots(false)

	end

	function this:updateIndicatorSpeedBoots()
		if (this.indicatorSpeedBoots == nil) then
			return
		end
		if global.isPopupOpened or global.isConfirmOpened or global.isCameraMoving or (not this.ourPlayer.inputAllowed) or (not this.indicatorSpeedBoots.isReady) then
			return
		end

		if this.indicatorSpeedBoots.isNear then
			this.indicatorSpeedBoots.tick = this.indicatorSpeedBoots.tick + 1

			if this.indicatorSpeedBoots.tick > this.indicatorSpeedBoots.tickMax then
				this:timeToCallSpeedBoots()

				this.indicatorSpeedBoots.tick = 1

			end

		else
			if this.indicatorSpeedBoots.tick > 1 then
				this.indicatorSpeedBoots.tick = this.indicatorSpeedBoots.tick - 1
			end
		end

	end

	function this:activateSpeedBoots(vBool, vNewPoint)
		if vBool then
			local str_value = 2 .. ' ' .. translate("MINUTES_SHORT")
			msg.post(this.indicatorSpeedBoots.view, "update_text", { value = str_value } )

			msg.post(this.indicatorSpeedBoots.root, "show")
			msg.post(this.indicatorSpeedBoots.effect, "updateVisible", { value = true} )
			msg.post(this.indicatorSpeedBoots.view, "setVisible", { value = true} )

			if vNewPoint then
				this.posSpeedBoots.x = vNewPoint.x
				this.posSpeedBoots.y = vNewPoint.y

				local pos_z1 = this:getPosZ(vNewPoint.y)
				local pos_z2 = this:getPosZ(vNewPoint.y - 10)

				msg.post(this.indicatorSpeedBoots.root,"setPosition",{x = vNewPoint.x, y = vNewPoint.y + 20, z = pos_z1})
				msg.post(this.indicatorSpeedBoots.effect,"setPosition",{x = vNewPoint.x-6, y = vNewPoint.y + 40, z = pos_z2})
				msg.post(this.indicatorSpeedBoots.view,"setPosition",{x = vNewPoint.x, y = vNewPoint.y + 125, z = DEEP_CLOUD})
				
			end

		else
			msg.post(this.indicatorSpeedBoots.root, "hide")
			msg.post(this.indicatorSpeedBoots.view, "setVisible", {value = false})
			msg.post(this.indicatorSpeedBoots.effect, "updateVisible", { value = false} )

		end

		this.indicatorSpeedBoots.tick = 1
		this.indicatorSpeedBoots.isReady = vBool

	end

	

	function this:initParrot()
		local parrot = Parrot:new()
		parrot.view = this:addAnimal(0, 0, 'parrot1')
		parrot:init()
		
		this.parrot = parrot
		
	end

	function this:initCrabs()
		if (global.numMarket > 100) then
			return
		end

		local count = math.random(1,3)
		for i = 1, count do
			this:addCrab(i)
		end

	end

	function this:addCrab(vNum)
		local p = utils.randomPointCircle(500, vmath.vector3(0, 0, 0))

		
		
		
		local isInside, pointNew = this:checkCrabPoint(p)
		
		if(isInside) then
			p = vmath.vector3(pointNew.x, pointNew.y, 0)
		end

		local object = Crab:new()
		object.view = this:addSpineDecor(p.x, p.y, 'crab1')
		
		object:init(vNum, p)

		msg.post(object.view, "initBody", {typeBody = "crab", num = vNum})

		table.insert(this.listCrabs, object)

		return object
	end

	function this:checkCrabPoint(vPos)
		local isInside = false
		local pointNew = vmath.vector3(0, 0, 0)

		if (global.numMarket == 4) then
			local pointsBeach1 = {
				vmath.vector3(-1800, -700, 0),
				vmath.vector3(-1700, -430, 0),
				vmath.vector3(-900, -570, 0),
				vmath.vector3(-1050, -810, 0)
			}
			local pointsBeach2 = {
				vmath.vector3(-120, -1000, 0),
				vmath.vector3(50, -700, 0),
				vmath.vector3(1500, -800, 0),
				vmath.vector3(1500, -1000, 0)
			}

			
			
			
			
			

			
			
			
			
			

			if utils.pointInPolygon(vPos, pointsBeach1) then
				isInside = true
			end

			if utils.pointInPolygon(vPos, pointsBeach2) then
				isInside = true
			end

			if isInside then
				pointNew = utils.randomPointCircle(100, vmath.vector3(-330, 180, 0))
			end

		elseif (global.numMarket == 6) then
			local pointsPool = {
				vmath.vector3(60, -180, 0),
				vmath.vector3(225, 230, 0),
				vmath.vector3(950, 115, 0),
				vmath.vector3(800, -300, 0)
			}
			local pointsRiver1 = {
				vmath.vector3(-1600, -800, 0),
				vmath.vector3(-800, 1000, 0),
				vmath.vector3(-400, 1000, 0),
				vmath.vector3(-1100, -800, 0)
			}
			local pointsRiver2 = {
				vmath.vector3(-500, 800, 0),
				vmath.vector3(-450, 1000, 0),
				vmath.vector3(600, 1000, 0),
				vmath.vector3(400, 700, 0)
			}

			
			
			
			
			
			
			
			
			
			
			
			
			
			
			

			if utils.pointInPolygon(vPos, pointsPool) then
				isInside = true
			end
			if utils.pointInPolygon(vPos, pointsRiver1) then
				isInside = true
			end
			if utils.pointInPolygon(vPos, pointsRiver2) then
				isInside = true
			end
			
			if isInside then
				pointNew = utils.randomPointCircle(100, vmath.vector3(-120, -250, 0))
			end

		end

		

		return isInside, pointNew
	end

	function this:checkParrot()
		if this.parrot and this.parrot.isAlive then
			this.parrot:update()
		end

		for i, crab in pairs(this.listCrabs) do
			if crab and crab.isAlive then
				crab:updateLogic()
			end
		end

	end

	function this:feedParrot()
		quest_manager.checkQuest('feed_parrot')

	end

	function this:kickHooligan()
		quest_manager.checkQuest('kick_hooligan')

	end

	function this:upgradeFromPopup()
		quest_manager.checkQuest('upgrade')

	end

	function this:addAnimal(vX, vY, vSkin, vZ)
		local posZ = vZ or this:getPosZ(vY)
		local newDodik = addFactorySpine({factoryName='#factoryAnimal',x=vX, y=vY, z=posZ})
		local decor = newDodik.root

		msg.post(decor, "randomCursor", { value = math.random()} )
		msg.post(decor, "updateView", { skin = vSkin} )
		msg.post(decor, "playAnim", { name = "idle_animal", loop = true} )

		if vSkin == 'fish1' then
			msg.post(decor, "playAnim", { name = "swim_fish", loop = true} )
		elseif vSkin == 'shrimp1' then
			msg.post(decor, "playAnim", { name = "swim_shrimp", loop = true} )
		end

		return decor
	end

	function this:addSpineDecor(vX, vY, vSkin, vZ)
		local posZ = vZ or this:getPosZ(vY)
		local newDodik = addFactorySpine({factoryName='#factorySpineDecor',x=vX, y=vY, z=posZ})
		local decor = newDodik.root

		msg.post(decor, "randomCursor", { value = math.random()} )
		msg.post(decor, "updateView", { skin = vSkin} )
		msg.post(decor, "playAnim", { name = "idle_animal", loop = true} )

		return decor
	end

	function this:updateCashboxAmount(vAmount)
		if this.isBoostCoinsX2 then
			vAmount = vAmount * 2
		end

		this.amountCashBox = this.amountCashBox + vAmount

		this:updateCashboxView()

	end

	function this:updateCashboxView()
		this.dataMart:updateCashboxView(this.amountCashBox)

		if this.placeCashBox then
			this.placeCashBox.countFood = this.amountCashBox

			if this.placeCashBox.countFood > 1000 then
				this.placeCashBox.countFood = 1000
			end

			this:updateSkladCash(this.placeCashBox.listFood, this.placeCashBox.countFood)
		end

	end

	function this:collectCashBox()
		local player = this.players['idMy']

		if (player.isCollecting) then
			return
		end

		if(this.amountCashBox > 0) then
			player.isCollecting = true

			timer.delay(0.07, false, function()
				player.isCollecting = false
			end)

			local collect = math.ceil(this.amountCashBox*0.05)
			collect = math.ceil(collect / 10) * 10

			

			this.amountCashBox = this.amountCashBox - collect
			coinmanager.plus_balance(collect)
			this:updateCashboxView()

			this.isCheckCashbox = true

			local pStart = vmath.vector3(this.placeCashBox.x, this.placeCashBox.y, 0)
			local pFinish = vmath.vector3(player.pos.x, player.pos.y + 30, 0)
			this:showFoodAnim(coinmanager.get_icon_name(), pStart, pFinish)

			playSound("sfx_cash"..global.selected_sfx[2])

			if (this.amountCashBox == 0) then
				this:finishMainAction('collect_cash')
			end

			quest_manager.checkQuest('collect_coins', collect)

		end

	end

	function this:addFunSquad()
		local isCanAdd = true

		if (not this.isFunSquadAdded) then
			local posCustomers = this.dataMart:getExitPoint(5)

			for i=1,5 do
				local dodik = this:addPlayer('id_fun'..i, posCustomers.x, posCustomers.y + 100,
					{
						skin	= 'monkey7',
						role	= ROLE_BUYER,
						is_bot	= true
					})

				dodik:updateVisible(false)
			end

			this.isFunSquadAdded = true
		else
			if gameState.players['id_fun1'].isAlive or
				gameState.players['id_fun2'].isAlive or
				gameState.players['id_fun3'].isAlive or
				gameState.players['id_fun4'].isAlive or
				gameState.players['id_fun5'].isAlive
			then
				isCanAdd = false
			end

		end

		if isCanAdd then
			
			local availableFood = gameState.funsquadSklads

			if (availableFood == nil) then
				lume.trace('[ WARNING ] availableFood is NIL')
				return
			end

			
			local list = {}
			local placesSkladsId = this.listWarehouses
			local sklad_id = 0

			local typeFood = 0

			for k,v in pairs(placesSkladsId) do
				sklad_id = this.dataMart.PLACES[v].id
				typeFood = this.listPlaceBoxes[sklad_id].typeFood

				if (table.indexOf(availableFood, typeFood) > 0) and (this.listPlaceBoxes[sklad_id].countFood > 1) then
					table.insert(list, typeFood)
				end
			end

			
			if #list == 0 then
				table.insert(list, availableFood[1])
			end

			this.typeFoodForFun = lume.randomchoice(list)
			this.typeHatForFun = lume.randomchoice({12,13,14,15,16,17,18,19,20})

			if (global.numMarket == 101) then
				this.typeHatForFun = lume.randomchoice({33,34,35,36,37})
			end
			if (global.numMarket == 102) then
				this.typeHatForFun = lume.randomchoice({40,41,42,43,44})
			end

			timer.delay(0.5, false, function() gameState:addNewBuyer(gameState.players['id_fun1'], true) end)
			timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.players['id_fun2'], true) end)
			timer.delay(1.5, false, function() gameState:addNewBuyer(gameState.players['id_fun3'], true) end)
			timer.delay(2.0, false, function() gameState:addNewBuyer(gameState.players['id_fun4'], true) end)
			timer.delay(2.5, false, function() gameState:addNewBuyer(gameState.players['id_fun5'], true) end)
		end

	end

	
	function this:addGraphicZavod(vData)
		local object = addFactorySpine(
			{
				factoryName = '#factoryGraphicSpine',
				x = vData.x,
				y = vData.y,
				z = vData.z
		})

		msg.post(object.root, "updatePropsView", {frameName = vData.sprite})

		return object.root
	end

	function this:addDecorObject(vFrameName, vPos, vOffsetY, vIsFlip, vAngle)
		local object = addFactorySpine(
			{
				factoryName = '#factoryGraphicSpine',
				x = vPos.x,
				y = vPos.y + vOffsetY,
				z = this:getPosZ(vPos.y)
		})

		msg.post(object.root, "updatePropsView", {frameName = vFrameName})

		if vIsFlip then
			msg.post(object.root, "updateFlip", {value = true, angle = 0})

			if vAngle and (vAngle ~= 0) then
				vAngle = -vAngle
			end
		end

		if vAngle and (vAngle ~= 0) then
			msg.post(object.root, "setAngle", {angle = vAngle})
		end

		return object.root
	end

	function this:addSpecObject(vPos)
		local object = addFactorySpine(
			{
				factoryName = '#factoryGraphicSpine',
				x = vPos.x,
				y = vPos.y + vPos.offsetY,
				z = this:getPosZ(vPos.y)
		})

		msg.post(object.root, "updatePropsView", {frameName = vPos.frame})

		

		return object.root
	end

	function this:addDroppedObject(vType, vPos)
		local spriteName = 'food'..vType

		if (vType == 0) then
			spriteName = coinmanager.get_icon_name()
		end

		local object = this:addGraphicZavod(
			{
				sprite = spriteName,
				x = vPos.x,
				y = vPos.y + 5,
				z = this:getPosZ(vPos.y)
			})

		table.insert(this.listDroppedObjects, {
			isLive		= true,
			pos			= vPos,
			view		= object,
			typeFood	= vType
		})

		local countDropped = #this.listDroppedObjects

		if (countDropped > LIMIT_DROPPED) then
			local getFirstObject = this.listDroppedObjects[1]

			if getFirstObject then
				msg.post(getFirstObject.view, "remove")
				table.remove(this.listDroppedObjects, 1)
			end
		end

		return object
	end

	function this:checkBoosts()
		if (global.tickBoostCoinsX2 > 0) then
			this:activateBoost('boost_coinsX2', 0)
		end
		if (global.tickBoostWorkers > 0) then
			this:activateBoost('boost_energyWork', 0)
		end
		if (global.tickBoostZavods > 0) then
			this:activateBoost('boost_energyZavod', 0)
		end
		if (global.tickBoostManager > 0) then
			this:activateBoost('boost_manager', 0)
		end
		if (global.tickBoostBoots > 0) then
			this:activateBoost('boost_boots', 0)
		end

		this:updateWindowBoost()

	end

	function this:activateBoost(vTypeBoost, vTimeBoost)
		local secBoost = vTimeBoost or TIME_BOOST
		local isHideOfferWindow = false
		local isNotSkip = true

		if (vTimeBoost == 0) then
			isNotSkip = false
		end

		lume.trace('activateBoost', vTypeBoost)

		if vTypeBoost == 'boost_bankomat' then
			this:addRewardedCoins(global.amount_ads)

			this:finishOfferBoost()

			msg.post(url_screen_gui_game, "update_money")

			datamanager.update_saves()

		elseif vTypeBoost == 'boost_pig' then
			this:addRewardedCoins(global.amount_golden_pig)

			msg.post(url_screen_gui_game, "update_money")

			datamanager.update_saves()

		elseif vTypeBoost == 'delivery_x3' then
			this:addRewardedCoins(global.amount_delivery_reward)
			this:finishDeliveryBoy()

			msg.post(url_screen_gui_game, "update_money")

			datamanager.update_saves()


		elseif vTypeBoost == 'boost_coinsX2' then
			isHideOfferWindow = true
			this.isBoostCoinsX2 = true

			global.tickBoostCoinsX2 = global.tickBoostCoinsX2 + secBoost

			msg.post(url_screen_gui_game, "setWindowBoost", {visible = true, type = vTypeBoost})

			if (this.numSale > 0) then
				msg.post(this.effectBoostCash, "updateVisible", { value = true} )
			end

		elseif vTypeBoost == 'boost_energyWork' then
			isHideOfferWindow = true
			this.isBoostWorkers = true

			local player = nil
			for k,v in pairs(this.players) do
				player = this.players[k]

				if player.isAlive then
					if player.isSleeping then
						player:wakeUp()
					end

					if (player.roleType == ROLE_STOCKMAN) or (player.roleType == ROLE_MANAGER) then
						player:setBoostSpeed(true)
					end
				end
			end

			global.tickBoostWorkers = global.tickBoostWorkers + secBoost

			msg.post(url_screen_gui_game, "setWindowBoost", {visible = true, type = vTypeBoost})

		elseif vTypeBoost == 'boost_energyZavod' then
			isHideOfferWindow = true
			this.isBoostZavods = true

			this.dataMart:updateZavodBoost(true)

			global.tickBoostZavods = global.tickBoostZavods + secBoost

			msg.post(url_screen_gui_game, "setWindowBoost", {visible = true, type = vTypeBoost})

		elseif vTypeBoost == 'boost_manager' then
			this.isBoostManager = true

			secBoost = vTimeBoost or TIME_MANAGER_WORK

			global.tickBoostManager = global.tickBoostManager + secBoost

			msg.post(url_screen_gui_game, "setWindowBoost", {visible = true, type = vTypeBoost})

			this.dodikManager:activateManager()

		elseif vTypeBoost == 'boost_boots' then
			this:setBoostBoots(true)

			msg.post(url_screen_gui_game, "setWindowBoost", {visible = true, type = vTypeBoost})

			global.tickBoostBoots = global.tickBoostBoots + secBoost

		elseif vTypeBoost == 'boost_fillWarehouse' then
			isHideOfferWindow = true

			this:fillWarehouseByType(global.typeFoodOffer)

		end

		if (isNotSkip) then
			if isHideOfferWindow then
				this:finishOfferBoost()
			end

			this:updateWindowBoost()

			global.tick_boosts[1] = global.tickBoostCoinsX2
			global.tick_boosts[2] = global.tickBoostWorkers
			global.tick_boosts[3] = global.tickBoostZavods
			global.tick_boosts[4] = global.tickBoostManager
			global.tick_boosts[5] = global.tickBoostBoots
			datamanager.update_save_value('tick_boosts')

		end

	end

	function this:setBoostBoots(vIsActivate)
		if vIsActivate then
			this.ourPlayer:updateSkin('monkey19', nil, global.selectedHat)
			this.ourPlayer:setBoostSpeed(true, 15)

		else
			this.ourPlayer:updateSkin('monkey1', nil, global.selectedHat)
			this.ourPlayer:setBoostSpeed(false, 10)
		end

		this.ourPlayer:updateHat(global.selectedHat)
		msg.post(this.ourPlayer.view, "setFood", { list = this.ourPlayer.listCollectedFood} )

	end

	function this:checkWarehouseBuyers()
		local count_buyers = 1
		local placesSkladsId = this.listWarehouses
		local countBusy = 0
		local sklad_id = 0
		local sklad = nil

		for k,v in pairs(placesSkladsId) do
			sklad_id = this.dataMart.PLACES[v].id
			sklad = this.listPlaceBoxes[sklad_id]
			countBusy = 0

			if (sklad.isActive and sklad.places) then
				for i=1,6 do
					if(sklad.places[i].isBusy) then
						countBusy = countBusy + 1
					end
				end

				if (countBusy >= count_buyers) then
					sklad.tickBuyer = sklad.tickBuyer + countBusy
				else
					sklad.tickBuyer = 0
				end

			end

			

		end

	end

	function this:getWarehouseWithMaxTickBuyer(value_min)
		local max_tick = 0
		local best_sklad = nil

		local placesSkladsId = this.listWarehouses

		for k,v in pairs(placesSkladsId) do
			sklad_id = this.dataMart.PLACES[v].id
			sklad = this.listPlaceBoxes[sklad_id]

			if sklad and (sklad.isActive) and (sklad.tickBuyer > value_min) and (sklad.tickBuyer > max_tick) then
				max_tick = sklad.tickBuyer
				best_sklad = sklad
			end
		end

		return best_sklad
	end

	function this:clearWarehousesTickBuyer()
		local placesSkladsId = this.listWarehouses

		for k,v in pairs(placesSkladsId) do
			sklad_id = this.dataMart.PLACES[v].id
			sklad = this.listPlaceBoxes[sklad_id]

			if sklad and (sklad.isActive) then
				sklad.tickBuyer = 0
			end
		end

		

	end

	function this:tickDetectWarehouses()
		if global.isCommercialBreak or global.isRewardBreak then
			
			return
		end

		if (not this.isOfferShowed) then
			
			return
		end
		
		this:checkWarehouseBuyers()

		local tick_min = TICK_WAIT_BUYERS
		local sklad = this:getWarehouseWithMaxTickBuyer(tick_min)

		if (this.isShowingOffer) then
			
			return
		end

		if (sklad) then
			global.typeFoodOffer = sklad.typeFood

			this:timeForOffer('boost_fillWarehouse')

			this:clearWarehousesTickBuyer()

		else
			
		end

	end

	function this:addEffectInWarehouse(effect_layer, effect_name, list_food, count_food)
		for k,v in pairs(list_food) do
			if (k > count_food) then
				addEffect(effect_layer, effect_name, vmath.vector3(v.pos.x, v.pos.y, DEEP_EFFECT))
			end
		end

	end

	function this:fillWarehouseByType(vTypeFood)
		

		local box = nil
		local count = 0

		for _,v in pairs(this.listWarehouses) do
			sklad = this.dataMart.PLACES[v].id
			box = this.listPlaceBoxes[sklad]

			if (box.isActive) and (box.typeFood == vTypeFood) then
				count = box.countFood

				box.countFood = box.maxCount

				this:updateSklad(box.listFood, box.countFood, sklad)
				
				break
			end
		end

		if box then
			
			this:addEffectInWarehouse("top", "effect_bleskOnce", box.listFood, count)
		end

	end

	function this:tickBoosts()
		if global.isCommercialBreak or global.isRewardBreak then
			return
		end

		local needToSave = false

		if global.tickBoostCoinsX2 > 0 then
			global.tickBoostCoinsX2 = global.tickBoostCoinsX2 - 1

			if (global.tickBoostCoinsX2 == 0) then
				this:finishBoostCoinsX2()
				needToSave = true
			end

			global.tick_boosts[1] = global.tickBoostCoinsX2
		end

		if global.tickBoostWorkers > 0 then
			global.tickBoostWorkers = global.tickBoostWorkers - 1

			if (global.tickBoostWorkers == 0) then
				this:finishBoostEnergyWorkers()
				needToSave = true
			end

			global.tick_boosts[2] = global.tickBoostWorkers
		end

		if global.tickBoostZavods > 0 then
			global.tickBoostZavods = global.tickBoostZavods - 1

			if (global.tickBoostZavods == 0) then
				this:finishBoostEnergyZavods()
				needToSave = true
			end

			global.tick_boosts[3] = global.tickBoostZavods
		end

		if global.tickBoostManager > 0 then
			global.tickBoostManager = global.tickBoostManager - 1

			if (global.tickBoostManager == 0) then
				this:finishBoostManager()
				needToSave = true
			end

			global.tick_boosts[4] = global.tickBoostManager
		end

		if global.tickBoostBoots > 0 then
			global.tickBoostBoots = global.tickBoostBoots - 1

			if (global.tickBoostBoots == 0) then
				this:finishBoostBoots()
				needToSave = true
			end

			global.tick_boosts[5] = global.tickBoostBoots
		end

		if this.tickOfferFreeCash > 0 then
			this.tickOfferFreeCash = this.tickOfferFreeCash - 1
		end

		this:updateWindowBoost()

		if (global.tickBoostCoinsX2 > 0) and (global.tickBoostCoinsX2 % 10 == 0) then
			needToSave = true
		end
		if (global.tickBoostWorkers > 0) and (global.tickBoostWorkers % 10 == 0) then
			needToSave = true
		end
		if (global.tickBoostZavods > 0) and (global.tickBoostZavods % 10 == 0) then
			needToSave = true
		end
		if (global.tickBoostManager > 0) and (global.tickBoostManager % 10 == 0) then
			needToSave = true
		end
		if (global.tickBoostBoots > 0) and (global.tickBoostBoots % 10 == 0) then
			needToSave = true
		end

		

		if needToSave then
			datamanager.update_save_value('tick_boosts')
		end

	end

	function this:updateWindowBoost()
		if (global.tickBoostCoinsX2 > 0) or
		(global.tickBoostWorkers > 0) or
		(global.tickBoostZavods > 0) or
		(global.tickBoostManager > 0) or
		(global.tickBoostBoots > 0) then
			msg.post(url_screen_gui_game, "updateWindowBoost", {
				value1 = global.tickBoostCoinsX2,
				value2 = global.tickBoostWorkers,
				value3 = global.tickBoostZavods,
				value4 = global.tickBoostManager,
				value5 = global.tickBoostBoots
			})
		end
	end

	function this:finishBoostCoinsX2()
		lume.trace('finish boost_coinsX2')
		this.isBoostCoinsX2 = false

		msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_coinsX2"})
		msg.post(this.effectBoostCash, "updateVisible", { value = false} )

	end

	function this:finishBoostEnergyWorkers()
		lume.trace('finish boost_energyWork')
		this.isBoostWorkers = false

		local player = nil
		for k,v in pairs(this.players) do
			player = this.players[k]

			if player.isAlive then
				if (player.roleType == ROLE_STOCKMAN) or (player.roleType == ROLE_MANAGER) then
					player:setBoostSpeed(false)
				end
			end
		end

		msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_energyWork"})
	end

	function this:finishBoostEnergyZavods()
		lume.trace('finish boost_energyZavod')
		this.isBoostZavods = false

		msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_energyZavod"})

		this.dataMart:updateZavodBoost(false)

	end

	function this:finishBoostManager()
		lume.trace('finish boost_manager')
		this.isBoostManager = false

		msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_manager"})

		this.dodikManager:exitManager()

	end

	function this:finishBoostBoots()
		lume.trace('finish boost_boots')

		msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_boots"})

		this:setBoostBoots(false)

	end

	function this:checkBoostManager()
		if (global.isBoughtManager) then
			if this.isBoostManager then
				global.tickBoostManager = 0
				global.tick_boosts[4] = 0
				msg.post(url_screen_gui_game, "setWindowBoost", {visible = false, type = "boost_manager"})

			else
				if (not this.indicatorM.isAdded) then
					this:addManager()
				end

				this.isBoostManager = true
				this.dodikManager:activateManager()
				this.indicatorM.tick = 1

			end

		end

	end

	function this:getBankomatValue()
		local value = 5

		local countMax = #this.dataMart.listSalesMain

		if (this.numSale == (countMax - 1)) then
			id_place = this.numSale
		elseif (this.numSale < countMax) then
			id_place = this.numSale + 1
		else
			id_place = this.numSale - 1
		end

		value = this.dataMart.pricePlaces[this.dataMart.listSalesMain[id_place]]

		return value
	end

	function this:getBankomatCoins(vKf_value)
		local priceCurrentPlace = 200
		local priceAllow = 100
		local id_place = 1

		local countMax = #this.dataMart.listSalesMain

		if (this.numSale == (countMax - 1)) then
			id_place = this.numSale
		elseif (this.numSale < countMax) then
			id_place = this.numSale + 1
		else
			id_place = this.numSale - 1
		end

		priceCurrentPlace = this.dataMart.pricePlaces[this.dataMart.listSalesMain[id_place]]
		priceAllow = math.floor(priceCurrentPlace * vKf_value)

		if (global.numMarket > 100) then
			
		end

		priceAllow = math.ceil(priceAllow / 10) * 10

		return priceAllow

	end

	function this:finishOfferBoost()
		msg.post(url_screen_gui_game, "setWindowOffer", {visible = false})

		if this.timerBoostHide then
			timer.cancel(this.timerBoostHide)
		end

		this.timerBoostHide = nil

		this.isShowingOffer = false

	end

	function this:initIndicatorManager()
		local object = addIndicator(
			{
				x = this.posManager.x,
				y = this.posManager.y + 125,
				z = DEEP_CLOUD
			})

		this.indicatorM = {
			typeInd	= 'manager',
			tick	= 1,
			tickMax	= global.timeIndicator,
			tickStep = 1,
			isAdded	= false,
			isReady	= false,
			isNear	= false,
			view	= object,
			pos		= vmath.vector3(this.posManager.x, this.posManager.y - 30, 0),
			callIndicatorEvent = this.timeToCallManager
		}

		table.insert(this.listIndicators, this.indicatorM)
		msg.post(object, "setIncicatorLink", { value = #this.listIndicators })

	end

	function this:activateIndicatorManager()
		if (not this.indicatorM.isReady) then
			this.indicatorM.isReady = true

		end

	end

	function this:addManager()
		this.dodikManager:updateVisible(true)
        this.dodikManager:showEffectExit()

		this.dodikManager.stageAction = ACTION_IDLE
		this.dodikManager.brainState = 10
		this.dodikManager:followPointPlace('start')

		this.indicatorM.isAdded = true

	end

	function this:timeToCallManager()
		if (config.isMobileTrue) and (not global.isNetworkConnected) then
			msg.post(url_popup_message, "show_message", {text_id = "NETWORK_DISCONNECTED"})
			return
		end

		if global.isAdBlocked then
			

			this.dodikManager:activateManager()
			this.dodikManager:exitManager()

		else
			global.typeOffer = 'boost_manager'

			if global.isMobileTrue then
				msg.post(url_popup_watch, "popup", {
					owner_url = msg.url()
				})
				gameState:stopMovement()

				global.isPopupOpened = true

			else
				gameState:showAdsForOffer()
			end

		end

		this.indicatorM.isReady = false
		msg.post(this.indicatorM.view, "setVisible", {value = false})

	end

	function this:updateIndicatorList()
		if global.isPopupOpened or global.isConfirmOpened or global.isCameraMoving or (not this.ourPlayer.inputAllowed) then
			return
		end

		for k,indicator in pairs(this.listIndicators) do
			if global.isBoughtManager and (indicator.typeInd == 'manager') then
				
			else
				if indicator.isAdded and indicator.isReady then
					if indicator.isNear then
						if (global.isCommercialBreak or global.isRewardBreak) then
							lume.trace('[ WARNING ] commercial_break / rewardbreak already! stop tick')
							return
						end

						indicator.tick = indicator.tick + indicator.tickStep

						if indicator.tick > indicator.tickMax then
							if indicator.callIndicatorEvent then
								indicator:callIndicatorEvent(indicator.scrollValue)
							end

							indicator.tick = 1

						end
					else
						if indicator.tick > 1 then
							indicator.tick = indicator.tick - 1
						end
					end
				end
			end
		end

	end

	

	function this:initDeliveryBoy()
		this.dodikDeliveryBoy:updateHat(6)

		local p = this.dodikDeliveryBoy.pos

		p.x = p.x - 200
		p.y = p.y + 200

		local cloudFood = addCloudFood(vmath.vector3(p.x, p.y + 100, DEEP_CLOUD))

		this.dataDeliveryBoy = {
			isAdded		= false,
			isReady		= false,
			isCompleted	= false,
			typeFood	= 0,
			priceOrder	= 0,
        	needFood	= 0,
        	countFood	= 0,
			typeFood2	= 0,
        	needFood2	= 0,
        	countFood2	= 0,
        	countWishrow	= 1,
        	timerOrder		= 0,
			cloudFood		= cloudFood.root
		}

		msg.post(this.dataDeliveryBoy.cloudFood, "hide")

	end

	function this:addDeliveryBoy()
		if (this.dataDeliveryBoy.isAdded) then
			return
		end

		local posCustomers = this.dataMart:getExitPoint(5)
		this.dodikDeliveryBoy:updatePosition({x = posCustomers.x, y = posCustomers.y})

		this.dodikDeliveryBoy:updateVisible(true)
		this.dodikDeliveryBoy:showEffectExit()

		local posDeliveryBoy = this.dataMart.posDeliveryBoy or vmath.vector3(0, 0, 0)

		this.dodikDeliveryBoy.stageAction = ACTION_GO_BASKET
		this.dodikDeliveryBoy.brainState = Player.GO_START
		this.dodikDeliveryBoy:followPointPlace('start')

		this.dataDeliveryBoy.isAdded = true
		this.dataDeliveryBoy.isReady = false
		this.dataDeliveryBoy.isCompleted = false

		this.dataDeliveryBoy.timerOrder = TIME_DELIVER_BOY_WORK
		
		if this.players[this.dodikDeliveryBoy.id] then
			setCamera("follow", this.players[this.dodikDeliveryBoy.id].view)
		end

		global.isCameraMoving = true

		timer.delay(1.6, false, function()
			setCamera("follow", this.players[this.controlId].view, 0.1)

			timer.delay(0.4, false, function()
				if this.players[this.controlId] then
					setCamera("follow", this.players[this.controlId].view)
				end
				global.isCameraMoving = false
				
			end)
		end)

		msg.post(url_screen_gui_game, "updateTextDelivery", {
			value = this.dataDeliveryBoy.timerOrder
		})

		this:stopMovement()

	end

	function this:getTotalFoodPrice(wishList)
		local total_price = 0

		for _, item in ipairs(wishList) do
			local type = item.type
			local count = item.count
			local price_per_unit = global.priceFood[type] or 0
			total_price = total_price + price_per_unit * count
		end

		return total_price
	end

	function this:updateDeliveryBoy(vState)
		local cloudFood = this.dataDeliveryBoy.cloudFood
		local p = this.dodikDeliveryBoy.pos

		local countWishrow = math.random(1, 2)

		local wishList = this:getWishList({isFunSquad = false, countWishrow = countWishrow})

		
		
		
		
		

		if (not wishList) then
			lume.trace('[ WARNING ] wishList nil')
			return
		end
		
		if (#wishList == 1) then
			countWishrow = 1
			lume.trace('[ WARNING ] countWishrow = 1, because wishList 1 item')
			
		end

		this.dataDeliveryBoy.countWishrow = countWishrow
		
		this.dataDeliveryBoy.typeFood = wishList[1].type
        this.dataDeliveryBoy.needFood = wishList[1].count
        this.dataDeliveryBoy.countFood = 0

		if (countWishrow > 1) then
			this.dataDeliveryBoy.typeFood2 = wishList[2].type
			this.dataDeliveryBoy.needFood2 = wishList[2].count
			this.dataDeliveryBoy.countFood2 = 0
		end

		local amount = this:getBankomatValue()
		amount = math.floor(amount * global.kf_coins_delivery)
		amount = math.ceil(amount / 10) * 10

		local price_food = this:getTotalFoodPrice(wishList)

		
		

		this.dataDeliveryBoy.priceOrder = (amount + price_food) * 2
		
		global.amount_delivery_reward = this.dataDeliveryBoy.priceOrder * 3

		msg.post(cloudFood, "initCloud", {
			pos = vmath.vector3(p.x, p.y + 150, 0),
			type = this.dataDeliveryBoy.typeFood,
			count1 = this.dataDeliveryBoy.countFood,
			count2 = this.dataDeliveryBoy.needFood
		})

		if (countWishrow > 1) then
			timer.delay(0.01, false, function()
			msg.post(cloudFood, "initCloud2", {
				type = this.dataDeliveryBoy.typeFood2,
				count1 = this.dataDeliveryBoy.countFood2,
				count2 = this.dataDeliveryBoy.needFood2
			})
			end)
		end

		this.dataDeliveryBoy.isReady = true

		msg.post(url_screen_gui_game, "setButtonDelivery", { value = true })

	end

	function this:collectDeliveryBoy(vPartFood)
		if (vPartFood == 1) then
			this.dataDeliveryBoy.countFood = this.dataDeliveryBoy.countFood + 1

			msg.post(this.dataDeliveryBoy.cloudFood, "updateCount", {
				count1 = this.dataDeliveryBoy.countFood,
				count2 = this.dataDeliveryBoy.needFood
			})

		end
		if (vPartFood == 2) then
			this.dataDeliveryBoy.countFood2 = this.dataDeliveryBoy.countFood2 + 1

			msg.post(this.dataDeliveryBoy.cloudFood, "updateCount2", {
				count1 = this.dataDeliveryBoy.countFood2,
				count2 = this.dataDeliveryBoy.needFood2
			})

		end

		local isCompleted = false

		if (this.dataDeliveryBoy.countWishrow == 1) then
			if (this.dataDeliveryBoy.countFood >= this.dataDeliveryBoy.needFood) then
				isCompleted = true
			end
		elseif (this.dataDeliveryBoy.countWishrow == 2) then
			if (this.dataDeliveryBoy.countFood >= this.dataDeliveryBoy.needFood) and (this.dataDeliveryBoy.countFood2 >= this.dataDeliveryBoy.needFood2) then
				isCompleted = true
			end
		end

		if isCompleted then
			this.dataDeliveryBoy.isCompleted = true

			this.dodikDeliveryBoy:updateMovement(false)

			msg.post(this.dodikDeliveryBoy.view, "playAnim", { name = "hi1", loop = false} )
		end

	end

	function this:tickDeliveryTimeOrder()
		if (this.dataDeliveryBoy and (not this.dataDeliveryBoy.isReady)) then
			return
		end

		if (this.dataDeliveryBoy.timerOrder > 0) then
			this.dataDeliveryBoy.timerOrder = this.dataDeliveryBoy.timerOrder - 1

			msg.post(url_popup_delivery, "update_time", {
				owner_url = msg.url(),
				value = this.dataDeliveryBoy.timerOrder
			})

			msg.post(url_screen_gui_game, "updateTextDelivery", {
				value = this.dataDeliveryBoy.timerOrder
			})

			if (this.dataDeliveryBoy.timerOrder == 0) then
				if (not this.dataDeliveryBoy.isCompleted) then
					this:finishDeliveryBoy()

					if global.isPopupDeliveryOpened then
						msg.post(url_popup_delivery, "close")
					end
				end
			end

		end

	end

	function this:finishDeliveryBoy()
		local cloudFood = this.dataDeliveryBoy.cloudFood

		this.dodikDeliveryBoy:updateMovement(true)
		this.dodikDeliveryBoy.stageAction = ACTION_EXIT

		msg.post(cloudFood, "hide")

		local p = this:getExitPoint(5)
		this.dodikDeliveryBoy:followPointForce(p)

		this.dataDeliveryBoy.isReady = false

		msg.post(url_screen_gui_game, "setButtonDelivery", { value = false })

	end

	function this:hideDeliveryBoy()
		this.dataDeliveryBoy.isAdded = false

	end

	

	function this:boostZavod(vBool, vNumPlace)
		local objectBoost = this.listPlaceBoxes[vNumPlace].objectBoost

		if vBool then
			if objectBoost.isSleeping then
				this:zavodWakeUp(objectBoost)
			end

			this.listPlaceBoxes[vNumPlace].stamina = this.listPlaceBoxes[vNumPlace].stamina_max
			this.listPlaceBoxes[vNumPlace].old_zavodBuild = this.listPlaceBoxes[vNumPlace].zavodBuild
			this.listPlaceBoxes[vNumPlace].zavodBuild = 4

			if this.listPlaceBoxes[vNumPlace].isActive then
				msg.post(objectBoost.boost, "updateVisible", { value = true} )
			end

		else
			this.listPlaceBoxes[vNumPlace].zavodBuild = this.listPlaceBoxes[vNumPlace].old_zavodBuild

			if this.listPlaceBoxes[vNumPlace].isActive then
				msg.post(objectBoost.boost, "updateVisible", { value = false} )
			end

		end

	end

	

	function this:addPlaces()
		local food = nil
		local pos = vmath.vector3()

		if #this.listPlaceBoxes > #this.pricePlaces then
			lume.trace('[ WARNING ] COUNT PLACES [>]', #this.listPlaceBoxes, 'CHECK this.pricePlaces', #this.pricePlaces)
		end
		if #this.listPlaceBoxes < #this.pricePlaces then
			lume.trace('[ WARNING ] COUNT PLACES [<]', #this.listPlaceBoxes, 'CHECK this.pricePlaces', #this.pricePlaces)
		end

		for i, box in pairs(this.listPlaceBoxes) do
			box.price = this.pricePlaces[i]
			pos = box.pos

			box.x = pos.x
			box.y = pos.y

			if box.link == "placebox_cashbox" then
				this.NUMPLACE_CAHSBOX = i
				lume.trace('[ INFO ] NUMPLACE_CAHSBOX',i)
			elseif box.link == "placebox_nextmart" then
				this.NUMPLACE_NEXTMART = i
				lume.trace('[ INFO ] NUMPLACE_NEXTMART',i)

			end

			if box.offsetY then
				pos.y = pos.y - box.offsetY
			end

			local posZ = this:getPosZ(pos.y)
			local posZ_2 = this:getPosZ(pos.y+2)

			if box.offsetY then
				pos.y = pos.y + box.offsetY
			end

			local graphic = addFactorySpine(
				{
					factoryName = '#factoryGraphicSpine',
					x = pos.x,
					y = pos.y,
					z = posZ
			})

			msg.post(graphic.root, "updatePropsView", {frameName = box.hash_animation})

			box.graphic = graphic.root

			if (box.isHideSprite) then
				msg.post(box.graphic, "disable")

				if global.isShowDebug and (table.indexOf(this.dataMart.aimPlaces, i) > 0) then
					msg.post(box.graphic, "enable")
				end
			end

			if (box.isSprite2) then
				local graphic2 = addFactorySpine(
					{
						factoryName = '#factoryGraphicSpine',
						x = pos.x - box.offsetGraphic.x,
						y = pos.y - box.offsetGraphic.y,
						z = posZ_2
				})

				msg.post(graphic2.root, "updatePropsView", {frameName = box.hash_animation2})

				box.graphic2 = graphic2.root

			end

			if box.isWarehouse then
				box.radius		= this.radiusSklad
				box.paid		= 0
				box.countFood	= 0
				box.maxCount	= dataSklad.getSkladMaxCountFood(box.typeSklad)
				box.isCollect	= true
				box.isSklad		= true
				box.isForBuyer	= true
				box.listFood	= {}
				box.places		= {}
				box.nameFood	= global.foodName[box.typeFood]
				
			end

			if box.isForBuyer then
				box.tickBuyer = 0
			end

			if global.isDebug and global.isShowRadius then
				local image = addGraphic({
					sprite="debug_point",
					x=box.x+box.offsetWork.x,
					y=box.y+box.offsetWork.y,
					z=DEEP_EFFECT
				})

				local scale = math.sqrt(box.radius)/15
				msg.post(image, "updateScale", {value = scale})
			end

			if box.isZavod then
				box.tree = graphic.root
				box.linkFood = {}

				if box.typeFood == 1 then
					addGraphic({sprite="place1", x=pos.x-8, y=pos.y-26, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="banana3", x=pos.x+4, y=pos.y+18, z=posZ})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 2 then
					food = this:addGraphicZavod({sprite="corn1", x=pos.x, y=pos.y+58, z=posZ})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 3 then
					food = this:addGraphicZavod({sprite="food3", x=pos.x-21, y=pos.y+10, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x+21, y=pos.y+10, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x-21+7, y=pos.y+30, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x+21+7, y=pos.y+30, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x-21, y=pos.y+10+30, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x+21, y=pos.y+10+30, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x-21+7, y=pos.y+30+30, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food3", x=pos.x+21+7, y=pos.y+30+30, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 5 then
					food = this:addGraphicZavod({sprite="food5", x=pos.x-22, y=pos.y+10, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x+22, y=pos.y+4, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x-22+15, y=pos.y+10+28, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x+22+15, y=pos.y+4+28, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x-22, y=pos.y+10+32, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x+22, y=pos.y+4+32, z=posZ + 0.00022})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x-22+15, y=pos.y+10+28+32, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food5", x=pos.x+22+15, y=pos.y+4+28+32, z=posZ + 0.00021})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 6 then
					local arPos = {
						{x = pos.x-25,		y = pos.y+10,		z = posZ + 0.00022},
						{x = pos.x+25,		y = pos.y+4,		z = posZ + 0.00022},
						{x = pos.x-25+17,	y = pos.y+10+32,	z = posZ + 0.00021},
						{x = pos.x+25+17,	y = pos.y+4+32,		z = posZ + 0.00021},
						{x = pos.x-25,		y = pos.y+10+33,	z = posZ + 0.00022},
						{x = pos.x+25,		y = pos.y+4+33,		z = posZ + 0.00022},
						{x = pos.x-25+17,	y = pos.y+10+32+33,	z = posZ + 0.00021},
						{x = pos.x+25+17,	y = pos.y+4+32+33,	z = posZ + 0.00021}
					}

					for k,v in pairs(arPos) do
						food = this:addGraphicZavod({sprite="food"..box.typeFood, x = v.x, y = v.y, z = v.z})
						table.insert(box.linkFood, food)
					end

				elseif box.typeFood == 7 then
					addGraphic({sprite="place_corn3", x=pos.x+5, y=pos.y-57, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="cocoa1", x=pos.x+9-15, y=pos.y-18+12, z=posZ})
					msg.post(food, "setAngle", {angle = 60})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="cocoa1", x=pos.x+9+20, y=pos.y-8+12, z=posZ - 0.0001})
					msg.post(food, "setAngle", {angle = 100})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 8 then
					addGraphic({sprite="place1", x=pos.x, y=pos.y-23, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="coffee_bean1", x=pos.x+10, y=pos.y+66, z=posZ + 0.00021})
					msg.post(food, "setAngle", {angle = 100})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="coffee_bean1", x=pos.x+28, y=pos.y+32, z=posZ + 0.00021})
					msg.post(food, "setAngle", {angle = 65})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="coffee_bean2", x=pos.x-25, y=pos.y+42, z=posZ + 0.00021})
					msg.post(food, "setAngle", {angle = -75})
					table.insert(box.linkFood, food)


				elseif box.typeFood == 9 then
					table.insert(box.linkFood, box.tree)

				elseif box.typeFood == 15 then
					addGraphic({sprite="place1", x=pos.x+6, y=pos.y-20, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food15", x=pos.x-2, y=pos.y+58, z=posZ})
					msg.post(food, "setAngle", {angle = 60})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food15", x=pos.x+25, y=pos.y+33, z=posZ + 0.0001})
					msg.post(food, "setAngle", {angle = 30})
					table.insert(box.linkFood, food)

				
				elseif (table.indexOf({4, 10,11,12,13,14, 16,17,18,19,20, 24,25,26,28, 31,32,34, 36,37,38,39, 41,45,46,47}, box.typeFood) > 0) then
					if box.offsetSklad then
						pos.x = pos.x + box.offsetSklad.x
						pos.y = pos.y + box.offsetSklad.y
					end

					local arPos, isFlip = dataSklad.getData(vmath.vector3(pos.x,pos.y,posZ), box.typeFood)

					for k,v in pairs(arPos) do
						food = this:addGraphicZavod({sprite="food"..box.typeFood, x = v.x, y = v.y, z = v.z})
						table.insert(box.linkFood, food)
					end

				elseif box.typeFood == 21 then
					msg.post(box.graphic, "disable")

					local object = this:addAnimal(pos.x, pos.y, 'shrimp1')
					msg.post(object, "updateVisible", { value = false} )

					msg.post(object, "moveFish", {
						start		= vmath.vector3(pos.x, pos.y, 0),
						angle		= -8,
						lengthStep	= 30,
						maxStep		= 12,
						time		= 4.0
					})

					msg.post(object, "initBody", {num = box.id, typeBody = "placeBox"})

					table.insert(box.linkFood, object)

				elseif box.typeFood == 22 then
					msg.post(box.graphic, "disable")

					local object = this:addAnimal(pos.x, pos.y, 'fish1')
					msg.post(object, "updateVisible", { value = false} )

					msg.post(object, "moveFish", {
						start		= vmath.vector3(pos.x, pos.y, 0),
						angle		= -8,
						lengthStep	= 30,
						maxStep		= 12,
						time		= 2.0
					})

					msg.post(object, "initBody", {num = box.id, typeBody = "placeBox"})

					table.insert(box.linkFood, object)

				elseif box.typeFood == 23 then
					local object = addGraphic({sprite="tree_rice1", x=pos.x-5, y=pos.y-35, z=DEEP_BACKGROUND})
					box.backSprite = object

					table.insert(box.linkFood, box.tree)

				elseif box.typeFood == 27 then
					addGraphic({sprite="place1", x=pos.x-1, y=pos.y-47, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="soyabean1", x=pos.x-14, y=pos.y+3, z=posZ})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="soyabean1", x=pos.x+7, y=pos.y+1, z=posZ + 0.0001})
					msg.post(food, "setAngle", {angle = 35})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 29 then
					food = this:addGraphicZavod({sprite="food29", x=pos.x-15, y=pos.y-3, z=posZ})
					msg.post(food, "updateFlip", { value = true} )
					table.insert(box.linkFood, food)

				elseif box.typeFood == 30 then
					addGraphic({sprite="place1", x=pos.x, y=pos.y-10, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="mushroom2", x=pos.x+2, y=pos.y+5, z=posZ})
					table.insert(box.linkFood, food)

					msg.post(box.tree, "disable")

				elseif box.typeFood == 33 then
					table.insert(box.linkFood, box.tree)

				elseif box.typeFood == 35 then
					addGraphic({sprite="place1", x=pos.x+4, y=pos.y-55, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food35", x=pos.x-40, y=pos.y-2, z=posZ})
					msg.post(food, "setAngle", {angle = -20})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food35", x=pos.x+40, y=pos.y-2, z=posZ})
					msg.post(food, "setAngle", {angle = 20})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food35", x=pos.x-1, y=pos.y+64, z=posZ})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 40 then
					addGraphic({sprite="place1", x=pos.x+15, y=pos.y-51, z=DEEP_BACKGROUND})
					
					box.tazik = addGraphic({sprite="dish2", x=pos.x-20, y=pos.y-110, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food40", x=pos.x+3, y=pos.y-90, z=posZ})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food40", x=pos.x-42, y=pos.y-84, z=posZ})
					table.insert(box.linkFood, food)

					msg.post(box.tazik, "disable")

				elseif box.typeFood == 42 then
					addGraphic({sprite="place1", x=pos.x+4, y=pos.y-52, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food42", x=pos.x-40+2, y=pos.y-23+14, z=posZ})
					msg.post(food, "setAngle", {angle = 45})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food42", x=pos.x+33+2, y=pos.y-1+14, z=posZ})
					msg.post(food, "setAngle", {angle = 45})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food42", x=pos.x-12+2, y=pos.y+42+14, z=posZ})
					msg.post(food, "setAngle", {angle = 45})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 43 then
					addGraphic({sprite="place1", x=pos.x+6, y=pos.y-59, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food43", x=pos.x-32+6, y=pos.y-30+11, z=posZ})
					msg.post(food, "setAngle", {angle = 100})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food43", x=pos.x+26+6, y=pos.y-31+11, z=posZ})
					msg.post(food, "setAngle", {angle = 120})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food43", x=pos.x-2+6, y=pos.y+24+11, z=posZ})
					msg.post(food, "setAngle", {angle = 110})
					table.insert(box.linkFood, food)

				elseif box.typeFood == 44 then
					addGraphic({sprite="place1", x=pos.x+4, y=pos.y-45, z=DEEP_BACKGROUND})

					food = this:addGraphicZavod({sprite="food44", x=pos.x-27+3, y=pos.y+4+2, z=posZ + 0.0001})
					msg.post(food, "setAngle", {angle = 15})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food44", x=pos.x-2+3, y=pos.y-7+2, z=posZ + 0.0003})
					msg.post(food, "setAngle", {angle = 45})
					table.insert(box.linkFood, food)

					food = this:addGraphicZavod({sprite="food44", x=pos.x+27+3, y=pos.y+3+2, z=posZ + 0.0002})
					msg.post(food, "setAngle", {angle = 70})
					table.insert(box.linkFood, food)

				end

				box:callCollect(box.linkFood, box.countFood)

			end

			if box.isSklad then
				local offsetSklad = vmath.vector3()

				if box.offsetSklad then
					offsetSklad.x = box.offsetSklad.x
					offsetSklad.y = box.offsetSklad.y
				end

				if box.typeSklad then
					if box.typeSklad == 'small' then
						this:initViewSkladSmall(box.typeSklad, box.x, box.y, box.typeFood, box.listFood, box.places, offsetSklad)
					else
						local data = this:initViewSkladBig(box.typeSklad, box.x, box.y, box.typeFood, box.listFood, box.places, offsetSklad)

						if data.offsetBuy then
							box.offsetBuy = data.offsetBuy
						end
					end

				else
					
					if box.callInit then	
						box:callInit(box.x, box.y, box.typeFood, box.listFood, box.places, offsetSklad)
					end
				end

				box.updateSklad = this.updateSklad

				if box.link == "placebox_cashbox" then
					box.updateSklad = this.updateSkladCash
				end

				box:updateSklad(box.listFood, box.countFood, box.id)
			end

			if box.isCaravan then
				graphic = addFactorySpine(
				{
					factoryName = '#factoryCaravan',
					x = pos.x,
					y = pos.y,
					z = posZ
				})

				msg.post(graphic.root, "setCaravan")

				box.graphic = graphic.root

				box.linkFood = {}
				box.listFood = {}

				local posFood = vmath.vector3(pos.x, pos.y, 0)

				if box.offsetFood then
					posFood.x = posFood.x + box.offsetFood.x
					posFood.y = posFood.y + box.offsetFood.y
				end

				local arPos, isFlip = dataSklad.getData(vmath.vector3(posFood.x, posFood.y, posZ), box.typeFood)

				for k,v in pairs(arPos) do
					food = this:addGraphicZavod({sprite="food"..box.typeFood, x = v.x, y = v.y, z = v.z})
					table.insert(box.linkFood, food)
					table.insert(box.listFood, {pos=vmath.vector3(v.x,v.y,v.z)})
				end

				box:callCollect(box.linkFood, box.countFood)

			end

			if (box.link == "placebox_nextmart") then
				if (global.numMarket == global.maxMarket) then
					msg.post(box.graphic, "disable")
					box.listPoints = nil
				end

			end

			
			if not box.isActive then
				msg.post(box.graphic, "disable")

				if (box.isSprite2) then
					msg.post(box.graphic2, "disable")
				end

				if (box.backSprite) then
					msg.post(box.backSprite, "hide")
				end

				if box.isZavod then
					box.countFood = 0
					box:callCollect(box.linkFood, box.countFood)
				end

			else
				if box.isPhysics and box.listPoints then
					table.insert(this.listObstacles, box.listPoints)
					this:updateMap(box.id)
				end

			end

			if (box.isPhysics) and (box.listPoints) then
				this:updateHitBox(box)
			end

			if (box.isCaravan) then
				box.listPoints.isDisable = true
				table.insert(this.listObstacles, box.listPoints)
				this:setCaravanState(box.id, 0)
			end

			
			if (box.paid > box.price) then
				box.paid = 0
			end

		end

	end

	function this:addBorders()
		local count = #this.listBorders

		if (count > 0) then
			local line, line1, line2, midPoint, dist = nil

			for j=1,count do
				line = this.listBorders[j]

				for i=1,#line - 1 do
					line1 = line[i]
					line2 = line[i+1]

					dist = lume.distance(line1.x, line1.y, line2.x, line2.y, false)

					if (dist > 400) then
						lume.trace('[ WARNING ] the line length is very long! ', 'border', j, 'line', i, 'distance', dist)
					end

					midPoint = trig.midPoint(vmath.vector3(line1.x,line1.y,0), vmath.vector3(line2.x,line2.y,0))
					table.insert(this.listLines, {ax=line1.x, ay=line1.y, bx=line2.x, by=line2.y, mid=midPoint})

					if global.isDebug and global.isShowPhysics then
						local image = nil
						image = addGraphic({sprite="debug_point",x=line1.x, y=line1.y, z=DEEP_CURSOR})
						msg.post(image, "updateTint", {color = '#FFFF00'})

						image = addGraphic({sprite="debug_point",x=line2.x, y=line2.y, z=DEEP_CURSOR})
						msg.post(image, "updateTint", {color = '#FFFF00'})

					end
				end
			end

		end

	end

	function this:addWater()
		if (#this.listWater > 0) then
			this.isHaveWater = true
		end

	end

	function this:checkWater(vPoint)
        local isInWater = false
        local nearPoint = nil
        local dist = 0

        for j,object in pairs(this.listWater) do
            dist = lume.distance(vPoint.x, vPoint.y, object.x, object.y, true)

            if (dist < 300000) then  
                if (utils.pointInPolygon(vPoint, {object.a,object.b,object.c,object.d})) then
                    isInWater = true
                    break
                end
            end

        end

        return isInWater
    end

	function this:checkSnow(vPoint)
        local isInWater = true
        local nearPoint = nil
        local dist = 0

        for j,object in pairs(this.listWater) do
            dist = lume.distance(vPoint.x, vPoint.y, object.x, object.y, true)

            if (utils.pointInPolygon(vPoint, {object.a,object.b,object.c,object.d})) then
                isInWater = false
                break
            end

        end

        return isInWater
    end

	
	function this:checkHintWhatBuy()
		if (global.numMarket == global.maxMarket) and (this.listSalesMain[this.numSale + 1] == 2) then
			lume.trace('[ WARNING ] checkHintWhatBuy miss because MAX buying')
			return
		end

		this:showArrowNextGoal(this.numSale + 1)
		this:updateAlert(true, {t = 'place', id = this.listSalesMain[this.numSale + 1]})

	end

	function this:checkNextPlaceSale(vPrevPlaceId, vIsFromSave)
		if global.isUnlockPlaces then
			return
		end

		local maxSale = #this.listSalesMain

		if (global.numMarket == global.maxMarket) then
			maxSale = maxSale - 1
		end

		if vPrevPlaceId then
			local isMain = table.indexOf(this.listSalesMain, vPrevPlaceId) > 0

			
			
			this.dataMart:checkNextPlaceSale(vPrevPlaceId)

			if not isMain or vIsFromSave then
				
				return
			end

		else
			if (this.numSale < maxSale) and (this.numSale > 0) then
				this:checkHintWhatBuy()
			end

		end

		if this.numSale < maxSale then
			local nextPlace = 0
			local currentPlace = this.listSalesMain[this.numSale]

			local numForSale = this.numSale + 1
			nextPlace = this.listSalesMain[numForSale]
			this:placeSetForSale(this.listPlaceBoxes[nextPlace])

			

			this.placeNumForSale = nextPlace
		else
			lume.trace('[ GAMEPLAY ] nothing to sale, all bought!', this.numSale)

			this.maxTickDelivery = TIME_DELIVER_BOY_CD2

			this.placeNumForSale = 0
		end


	end

	function this:placeSetForSale(box)
		if box.isActive then
			return
		end

		
		local point = vmath.vector3(box.x + box.offsetBuy.x, box.y + box.offsetBuy.y, DEEP_DUST)
		local aimZone = addFactoryAimzone(point)

		box.isSelling = true

		msg.post(aimZone.root, 'setup', {id = box.id, price = box.price - box.paid})

		box.linkAimzone = aimZone

		if this.isTutorial then
			if box.id == 5 then
				this.stepTutorial = 1
				this:updateTutorial()
			elseif box.id == 1 then
				this.stepTutorial = 2
				this:updateTutorial()
			elseif box.id == 2 then
				this.listPlaceBoxes[1].countFood = 2
				this.listPlaceBoxes[1]:callCollect(this.listPlaceBoxes[1].linkFood, this.listPlaceBoxes[1].countFood)
			end
		end

	end

	function this:placeCheckBuy(vPlayer, box)
		if (vPlayer.isCollecting) then
			return
		end

		vPlayer.isCollecting = true

		timer.delay(TIME_BUYING, false, function()
			vPlayer.isCollecting = false
		end)

		local coins_value = coinmanager.get_balance()

		if coins_value > 0 then
			local needToPay = box.price-box.paid
			local collect = math.ceil(needToPay*0.2)

			if (collect < 0) then
				collect = 0
			end

			if (collect > coins_value) then
				collect = coins_value

				if collect > needToPay then
					collect = needToPay
				end
			end

			

			coinmanager.minus_balance(collect)
			box.paid = box.paid + collect

			this.dataMart.have_places[box.id][2] = box.paid

			msg.post(box.linkAimzone.root, 'updateText', {price = box.price - box.paid})

			local pStart = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + 30, 0)
			local pFinish = vmath.vector3(box.x + box.offsetBuy.x, box.y + box.offsetBuy.y, 0)
			this:showFoodAnim(coinmanager.get_icon_name(), pStart, pFinish)

			playSound("sfx_cash"..global.selected_sfx[2])

			this.isUpdateCoins = true

			if box.paid >= box.price then
				this:placeSetBought(box)
				this:checkNextPlaceSale(box.id)
			else
				local coins_value = coinmanager.get_balance()
				if (coins_value == 0) and (this.tickOfferFreeCash <= 0) then
					
					
					

					this:timeForOffer("boost_bankomat")
				end
			end

		end

	end

	function this:placeSetBought(box)
		this.arrowDirectionPos = nil
		msg.post(this.arrowHintDirection, "hide")

		box.isActive = true
		box.isSelling = false

		msg.post(box.linkAimzone.root, 'hide')

		msg.post(box.graphic, "enable")

		if (box.isHideSprite) then
			msg.post(box.graphic, "disable")
		end

		if (box.isPhysics) then
			table.insert(this.listObstacles, box.listPoints)
			this:updateMap(box.id)

			this:checkInsidePlace('player', this.ourPlayer.pos, box.id)
		end

		if (box.isSprite2) then
			msg.post(box.graphic2, "enable")
		end

		if (box.backSprite) then
			msg.post(box.backSprite, "show")
		end

		if (not box.isHideSprite) then
			msg.post(box.graphic, "setTweenEffect")

			if (box.isSprite2) then
				msg.post(box.graphic2, "setTweenEffect")
			end
		end

		local isEffect = true

		if (box.typeFood == 21) or (box.typeFood == 22) then
			isEffect = false
		end

		if (box.isZavod) and ((box.typeFood == 9) or (box.typeFood == 23)) then
			box.countFood = 1
			box.zavodTick = 0
		end

		if (box.indicatorData) then
			box.indicatorData.tick = -10
		else
			if (box.linkSklad) and (this.listPlaceBoxes[box.linkSklad].indicatorData) then
				this.listPlaceBoxes[box.linkSklad].indicatorData.tick = -10
				lume.trace('===> linkSklad indicatorData', box.id)
			end
		end

		if (this.tickAddDelivery >= this.maxTickDelivery) then
			this.tickAddDelivery = this.maxTickDelivery - 10
		end

		if isEffect then
			addEffect("top", "effect_exit", vmath.vector3(box.x, box.y, DEEP_EFFECT))
		end

		playSound("sfx_newobject"..global.selected_sfx[8])

		this.dataMart:placeCheckBought(box.id, false)

		this.dataMart.have_places[box.id][1] = true

		local countMaxSale = #this.listSalesMain
		local isMain = table.indexOf(this.listSalesMain, box.id) > 0

		if isMain then
			this.numSale = this.numSale + 1

			this.dataMart:updateNumSale(this.numSale)

			if (global.numMarket < 100) then
				local progress = global.numSale1 + global.numSale2 + global.numSale3 + global.numSale4 + global.numSale5 + global.numSale6
				apimanager.sendAnalytics('PROGRESS', progress)
			end

			this:updateAlert(false, {t = 'place'})
			
			local isStartCelebrating = false

			

			if (this.listPlaceBoxes[this.listSalesMain[countMaxSale]].link == "placebox_nextmart") then
				if (this.numSale == countMaxSale - 1) then
					isStartCelebrating = true
				end
			else
				if (this.numSale == countMaxSale) then
					isStartCelebrating = true
				end
			end

			if (isStartCelebrating) then
				msg.post(url_screen_gui_game, 'disable')
				
				timer.delay(0.5, false, function()
					gameState:startCelebrating()
				end)

				if global.isMobileTrue then
					apimanager.swift_timer_ads()
				end
	
			end
	
		end

		lume.trace(box.id,'------> bought main?', isMain, 'numSale', this.numSale, '/', countMaxSale)

		datamanager.update_saves()

		this:finishMainAction('place')

		quest_manager.checkQuest('buy_place')

		
		this:showNextGoal(box.id, this.numSale + 1)

		if this.arrowNextGoal == box.id then
			gameState:showHint(false, 2, 'arrow')
		end

	end

	function this:showTaskPosition()
		if (#this.listAlert > 0) then
			local typeTask = this.listAlert[1].t
			local idTask = this.listAlert[1].id

			if typeTask == 'place' then
				if idTask then
					local object = this.listPlaceBoxes[idTask]
					local pos = object.pos + object.offsetBuy
					this:followCameraPoint(pos.x, pos.y)
				end

			else
				local id_tile = this.dataMart.placesAlert[typeTask]

				if id_tile then
					local tile = this.dataMart:getTilePlace(id_tile)
					local pos = this:getPosFromTile(tile.x, tile.y)
					this:followCameraPoint(pos.x, pos.y)
				else
					if idTask then
						local object = this.listPlaceBoxes[idTask]
						local pos = object.pos + object.offsetBuy
						this:followCameraPoint(pos.x, pos.y)
					end
				end

			end

		end

	end

	function this:showNextGoal(vBoxId, vNumPlace)
		local index = table.indexOfLast(this.dataMart.placesCamera, vBoxId)

		if index > 0 then
			this:followCameraPlace(this.listSalesMain[vNumPlace])
		end

	end

	function this:showArrowNextGoal(vNumPlace)
		local currentPlace = this.listSalesMain[vNumPlace]
		local object = this.listPlaceBoxes[currentPlace]
		local pos = object.pos + object.offsetBuy
		gameState:showHint(true, 2, 'arrow', pos, 170)
		
		this.arrowNextGoal = currentPlace

	end

	function this:setZavodView(vBoxId, vIdPlace, vType, vIdPlace2)
		local num = this.dataMart.PLACES[vIdPlace].id
		local panel = this.listPlaceBoxes[vBoxId].objectPanel
		local object = this.listPlaceBoxes[vBoxId].objectBoost

		if vType == "animal" then
			msg.post(object.panel.root, "show")
			msg.post(object.view, "updateVisible", { value = true} )
			msg.post(this.listPlaceBoxes[num].graphic, "enable")

			if (not vIsFromSave) then
				msg.post(this.listPlaceBoxes[num].graphic, "setTweenEffect")
			end

		else
			msg.post(panel.root, "show")
			msg.post(this.listPlaceBoxes[num].tree, "show")

			if (not vIsFromSave) then
				msg.post(this.listPlaceBoxes[num].tree, "setTweenEffect")
			end

			if vIdPlace2 then 	
				local num2 = this.dataMart.PLACES[vIdPlace2].id
				this.listPlaceBoxes[num2].isActive = true
				local panel2 = this.listPlaceBoxes[num2].objectPanel
				msg.post(panel2.root, "show")
			end

		end

		this.listPlaceBoxes[num].isActive = true

		if gameState.isBoostZavods then
			msg.post(object.boost, "show")
		end

	end

	

	function this:initFoodAnims()
		local obj = nil
		this.foodAnims = {}
		this.foodAnimNum = 0
		this.foodAnimMax = 15

		for i=1,this.foodAnimMax do
			obj = this:addGraphicZavod({sprite="food1", x=0, y=0, z=DEEP_FOOD_ANIM})
			msg.post(obj, 'hide')
			table.insert(this.foodAnims, obj)
		end

	end

	function this:getFoodAnims()
		this.foodAnimNum = this.foodAnimNum + 1

		if this.foodAnimNum > this.foodAnimMax then
			this.foodAnimNum = 1
		end

		return this.foodAnims[this.foodAnimNum]

	end

	function this:showFoodAnim(vFrameName, pStart, pFinish)
		local food = this:getFoodAnims()
		msg.post(food, "updatePropsView", {frameName = vFrameName})
		msg.post(food, "moveXY", {start = pStart, finish = pFinish, time = TIME_COLLECT})

	end

	function this:showFoodAnim2(vFrameName, pStart, pFinish)
		local food = this:getFoodAnims()
		msg.post(food, "updatePropsView", {frameName = vFrameName})
		msg.post(food, "moveFlyXY", {start = pStart, finish = pFinish, time = 0.5})

	end

	

	function this:updateHitBox(vBox)
		local listPoints = vBox.listPoints

		vBox.listHitBox = {
			a = vmath.vector3(listPoints.a.x,listPoints.a.y,0),
			b = vmath.vector3(listPoints.b.x,listPoints.b.y,0),
			c = vmath.vector3(listPoints.c.x,listPoints.c.y,0),
			d = vmath.vector3(listPoints.d.x,listPoints.d.y,0)
		}

		if global.isDebug and global.isShowPhysics then
			local image = nil

			for k,p in pairs(vBox.listHitBox) do
				image = addGraphic({sprite="debug_point",x=p.x, y=p.y, z=DEEP_CURSOR})
			end

		end

		local angle = 0
		local delta = 55
		local center = listPoints.mid

		for k,p in pairs(vBox.listHitBox) do
			angle = lume.angle(center.x, center.y, p.x, p.y)
			p.x = utils.round(p.x + math.cos(angle)*delta)
			p.y = utils.round(p.y + math.sin(angle)*delta)

			if k == 'b' or k == 'c' then
				p.y = p.y + 10
			end
			if k == 'a' or k == 'd' then
				p.y = p.y - 25
			end
		end

		if global.isDebug and global.isShowPhysics then
			local image = nil

			for k,p in pairs(vBox.listHitBox) do
				image = addGraphic({sprite="debug_point",x=p.x, y=p.y, z=DEEP_CURSOR})
				msg.post(image, "updateTint", {color = '#00FF00'})
			end

		end

	end

	

	function this:updateLogicBuy(vId, vRoleType)
		local player = this.players[vId]
		local distance = 0

		if (vRoleType == ROLE_WORKER) or (vRoleType == ROLE_MANAGER) then
			
			local radius_appliance = 0

			for k,object in pairs(this.listZavodObjects) do
				if object.isSleeping then
					distance = lume.distance(player.pos.x, player.pos.y, object.pos.x, object.pos.y, true)
					radius_appliance = object.radius

					if (vRoleType == ROLE_MANAGER) then
						radius_appliance = radius_appliance * 1.2
					end

					if distance < radius_appliance then
						this:zavodWakeUp(object)
					end
				end
			end

			
			if this.isAllowHooligan then
				distance = lume.distance(player.pos.x, player.pos.y, this.dodikHooligan.pos.x, this.dodikHooligan.pos.y, true)
				if distance < 5000 then
					this.dodikHooligan:goHooliganAway()
				end
			end

		end

		if (vRoleType ~= ROLE_WORKER) or (global.isPopupOpened) then
			return
		end

		local len_vel = vmath.length(player.velocity)

		if (len_vel == 0) then
		for i, box in pairs(this.listPlaceBoxes) do
			if (not box.isActive) and (box.isSelling) then
				distance = lume.distance(player.pos.x, player.pos.y, box.x+box.offsetBuy.x, box.y+box.offsetBuy.y, true)

				if (distance < 2000) then
					this:placeCheckBuy(player, box)
				else
					this.isUpdateCoins = false
				end

			end
		end
		end

		local countCollected = #player.listCollectedFood

		for i, box in pairs(this.listDroppedObjects) do
			if box.isLive and (not player.isCollecting) then
				distance = lume.distance(player.pos.x, player.pos.y, box.pos.x, box.pos.y, true)

				if (distance < 2200) then
					if (box.typeFood <= 0) then
						this:collectDroppedCash(player, box, box.typeFood)
					else
						if (countCollected < player.maxFood) then
							this:collectDroppedFood(player, box)
						end
					end
				end
			end
		end

		
		for i, box in pairs(this.listDroppedObjects) do
			if (not box.isLive) then
				table.remove(this.listDroppedObjects, i)
			end
		end

		
		if this.placeCashBox then
		distance = lume.distance(player.pos.x, player.pos.y, this.placeCashBox.x, this.placeCashBox.y-10, true)
		if distance < this.placeCashBox.radius then
			this:collectCashBox()
			this.isNearCashbox = true

		else
			this.isNearCashbox = false

			if (this.isCheckCashbox) and (this.amountCashBox > 0) then
				this:finishMainAction('collect_cash')
			end

			this.isCheckCashbox = false

		end
		end

		local isMovePlayer = vmath.length(player.velocity) > 0

		
		for k,indicator in pairs(this.listIndicators) do
			distance = lume.distance(player.pos.x, player.pos.y, indicator.pos.x, indicator.pos.y, true)

			if distance < 4000 then
				if (not isMovePlayer) then
					indicator.isNear = true
				end
			else
				indicator.isNear = false
			end
		end

		
		if this.indicatorPig then
			distance = lume.distance(player.pos.x, player.pos.y, this.posGoldenPig.x, this.posGoldenPig.y, true)
			if distance < 4000 then
				if (not isMovePlayer) then
					this.indicatorPig.isNear = true
				end
			else
				this.indicatorPig.isNear = false
			end
		end

		
		if this.indicatorSpeedBoots then
			distance = lume.distance(player.pos.x, player.pos.y, this.posSpeedBoots.x, this.posSpeedBoots.y, true)
			if distance < 4000 then
				if (not isMovePlayer) then
					this.indicatorSpeedBoots.isNear = true
				end
			else
				this.indicatorSpeedBoots.isNear = false
			end
		end

		if global.isPopupOpened then
			return
		end

		
		if this.isAllowNextMart and (this.dataMart.PLACES["placebox_nextmart"].isActive) then
			distance = lume.distance(player.pos.x, player.pos.y, this.posNextMarket.x, this.posNextMarket.y, true)
			if distance < 6000 then
				if (not isMovePlayer) and (this.isAllowShowMart) then
					msg.post(url_screen_gui_game, "showPopupMart")
					this.isAllowShowMart = false
				end
			else
				this.isAllowShowMart = true
			end
		end

		
		if (not isMovePlayer) and this.parrot and this.parrot.isAlive then
			if (not player.isCollecting) and (this.parrot.action == 2) then
				distance = lume.distance(player.pos.x, player.pos.y, this.parrot.pos.x, this.parrot.pos.y, true)
				if (distance < 4000) then
					local typeFood = this.parrot.typeFood
					local index = table.indexOfLast(player.listCollectedFood, typeFood)

					if index > 0 then
						this:dropFood(player, nil, this.parrot.pos, index)
						this.parrot:collectFood()
					end
				end
			end
		end

		
		if this.dataDeliveryBoy and this.dataDeliveryBoy.isReady then
			distance = lume.distance(player.pos.x, player.pos.y, this.dodikDeliveryBoy.pos.x, this.dodikDeliveryBoy.pos.y, true)
			
			if (not player.isCollecting) then
				if distance < 4000 then
					if (not isMovePlayer) then
						local isDropping = false

						if (not this.dataDeliveryBoy.isCompleted) then
							local typeFood = this.dataDeliveryBoy.typeFood
							local index = 0
							
							if (this.dataDeliveryBoy.countFood < this.dataDeliveryBoy.needFood) then
								index = table.indexOfLast(player.listCollectedFood, typeFood)

								if index > 0 then
									this:dropFood(player, nil, this.dodikDeliveryBoy.pos, index, 'stock')
									this:collectDeliveryBoy(1)
									isDropping = true
								end
							end

							if (not isDropping) and (this.dataDeliveryBoy.countFood2 < this.dataDeliveryBoy.needFood2) then
								typeFood = this.dataDeliveryBoy.typeFood2
								index = table.indexOfLast(player.listCollectedFood, typeFood)

								if index > 0 then
									this:dropFood(player, nil, this.dodikDeliveryBoy.pos, index, 'stock')
									this:collectDeliveryBoy(2)
									isDropping = true
								end
							end
						end

						if this.isAllowShowDelivery and (not isDropping) then
							msg.post(url_screen_gui_game, "showPopupDelivery")
							this.isAllowShowDelivery = false
						end
					end

				else	
					this.isAllowShowDelivery = true
				end
			end
		end

	end

	function this:updateLogicCollect(vId, vAllowPlaces)
		local player	= this.players[vId]
		local roleType	= player.roleType
        local distance	= 0
		local isMovePlayer = vmath.length(player.velocity) > 0

		if (roleType == ROLE_WORKER) or (roleType == ROLE_STOCKMAN) then
			local hitPoint = nil
			local isInsideHitBox = false

			for i, box in pairs(this.listPlaceBoxes) do
				if (box.isActive) and (i ~= this.NUMPLACE_CAHSBOX) then

				distance = lume.distance(player.pos.x, player.pos.y, box.x+box.offsetWork.x, box.y+box.offsetWork.y, true)
				isInsideHitBox = false

				if (roleType == ROLE_WORKER) and (box.isPhysics) and (box.isForBuyer) then
					hitPoint = box.listHitBox

					if (utils.pointInPolygon(player.pos, {hitPoint.a,hitPoint.b,hitPoint.c,hitPoint.d})) then
						isInsideHitBox = true
					end
				end

				if (distance < box.radius) or (isInsideHitBox) then
					local boxAllow = utils.isInList(box.id, vAllowPlaces)

					if (roleType == ROLE_WORKER) or (boxAllow) then
						local countCollected = #player.listCollectedFood

						if (box.isZavod or box.isCaravan) and (box.countFood > 0) and (countCollected < player.maxFood) then
							if player.allowCollect then
								this:collectFood(player, box)
							end

						elseif (box.isSklad) and (countCollected > 0) then
							
							if player.allowDrop then
								if (roleType == ROLE_WORKER) and (box.isForBuyer) then
									if isInsideHitBox then
										this:dropFood(player, box)
									end
								else
									this:dropFood(player, box)
								end
							end

						end
					end
				end

				end

			end

			
			distance = lume.distance(player.pos.x, player.pos.y, this.posTrash.x, this.posTrash.y, true)
			if (not isMovePlayer) and (distance < 3000) then
				this:clearFood(player, this.posTrash)

			end

		elseif (roleType == ROLE_BUYER) and (not player.isFollowPath) then
			if player.stageAction == ACTION_PICKING then
				for i, box in pairs(this.listPlaceBoxes) do
					if (box.isActive) and (box.isForBuyer) then
					distance = lume.distance(player.pos.x, player.pos.y, box.x+box.offsetWork.x, box.y+box.offsetWork.y, true)

					if (distance < box.radius) then
						if (box.isSklad) and
							(box.countFood > 0) and
							(box.typeFood == player.wishFood.type)
						then
							this:collectFood(player, box)
							this:updateSklad(box.listFood, box.countFood, box.id)
						end
					end
					end
				end

			elseif player.stageAction == ACTION_PACKING then
				this:clearFood(player, vmath.vector3(this.placeCashBox.x + 40, this.placeCashBox.y - 10, 0))

			end

		end

	end

	function this:updatePacking(vId)
		local player = this.players[vId]

		if (player.stageAction == ACTION_GO_PAY) then
			local cost = player.wishFood.costFood
			local count = #player.listCollectedFood
			local time1 = TIME_COLLECT*count + TIME_PACKING
			local time2 = TIME_COLLECT*count + TIME_PAYING

			player:goPacking(count, time1)

			quest_manager.checkQuest('serve_customer')

			this.count_customer = this.count_customer + 1
			this.count_cash = this.count_cash + cost

			this.dodikAssist1:workCashier()

			timer.delay(time2, false, function()
	            this:updateCashboxAmount(cost)
				player:playAudio('payment')
	        end)

			if this.isTutorial then
				if (this.stepTutorial == 4) then
					this.stepTutorial = 5
					this:updateTutorial()
				end
			end
		end

	end

	function this:addQueueCashbox(vId)
		table.insert(this.queueCashbox, vId)

		
		

	end

	function this:updateQueueCashbox()
		local isCanUpdate = false

		if (this.isHaveCashier) and (this.dodikAssist1:checkCashier()) then
			isCanUpdate = true
		end

		if (this.isNearCashbox) then
			isCanUpdate = true
		end

		if (isCanUpdate) and (this.isCanCheckQueue) and (#this.queueCashbox > 0) then
			local idBuyer = this.queueCashbox[1]

			if (idBuyer) and (not this.players[idBuyer].isFollowPath) then
				idBuyer = table.remove(this.queueCashbox, 1)
				this:updatePacking(idBuyer)

				this.isCanCheckQueue = false
			end
		end

	end

	function this:shiftQueueCashbox()
		
		this.isCanCheckQueue = true

		local player = nil
		for k,v in pairs(this.queueCashbox) do
			player = this.players[v]
			if player then
				if (player.stageAction == ACTION_GO_PAY) and (player.isInQueue) then
					

					this:clearOffsetPlace(player.numPlaceBox, player.numPlaceOffset)
					player.numPlaceOffset = 0
					player.isFollowPath = true
					player.isSkladPlace = true
					player:checkFollowingPlace()
				end
			end
		end

	end

	

	function this:updateZavodAnim(vBox)
		if vBox.linkSklad then
			local isCanBuild = false

			local placeSklad = this.listPlaceBoxes[vBox.linkSklad]

			if placeSklad then
				if vBox.isMultiple then
					local placeSklad2 = this.listPlaceBoxes[vBox.linkSklad2]
					isCanBuild = (placeSklad.countFood > 0) and (placeSklad2.countFood > 0)
				else
					isCanBuild = (placeSklad.countFood > 0)
				end
			end

			if isCanBuild then
				local object = vBox.objectBoost

				if object then
					if object.type == 'animal' then
						msg.post(object.view, "playAnim", { name = "eat_animal", loop = false} )

					elseif object.type == 'machine' then
						msg.post(vBox.tree, "setTreeEffect", {time = 0.4})

						if object.cooker then
							msg.post(object.cooker, "playAnim", { name = "diler1", loop = false} )
						end
					end
				end

			end
		end

	end

	function this:updateZavod(vBox)
		if (vBox.stamina == 0) then
			return
		end
		if (vBox.isActive) and (vBox.countFood < vBox.maxCount) then
			if vBox.linkSklad then
				if vBox.isMultiple then
					local placeSklad1 = this.listPlaceBoxes[vBox.linkSklad]
					local placeSklad2 = this.listPlaceBoxes[vBox.linkSklad2]

					if (placeSklad1.countFood > 0) and (placeSklad2.countFood > 0) then
						placeSklad1.countFood = placeSklad1.countFood - 1
						this:updateSklad(placeSklad1.listFood, placeSklad1.countFood, placeSklad1.id)

						placeSklad2.countFood = placeSklad2.countFood - 1
						this:updateSklad(placeSklad2.listFood, placeSklad2.countFood, placeSklad2.id)

						vBox.countFood = vBox.countFood + 1
						vBox:callCollect(vBox.linkFood, vBox.countFood, vBox.tree, true)

						this:updateStamina(vBox.id)
					end
				else
					local placeSklad = this.listPlaceBoxes[vBox.linkSklad]

					if (placeSklad.countFood > 0) then
						placeSklad.countFood = placeSklad.countFood - 1
						this:updateSklad(placeSklad.listFood, placeSklad.countFood, placeSklad.id)

						vBox.countFood = vBox.countFood + 1
						vBox:callCollect(vBox.linkFood, vBox.countFood, vBox.tree, true)

						this:updateStamina(vBox.id)
					end
				end


			else
				vBox.countFood = vBox.countFood + 1
				vBox:callCollect(vBox.linkFood, vBox.countFood, vBox.tree, true)
			end
		end

	end

	function this:updateSklad(vListFood, vCountFood, vId)
		for i, box in pairs(vListFood) do
			if i <= vCountFood then
				msg.post(box.view,"show")
			else
				msg.post(box.view,"hide")
			end
		end

		local place = this.listPlaceBoxes[vId]

		if place.objectPanel and (not place.linkSklad) then
			local object = place.objectPanel
			msg.post(object.root, "updateText", {text1 = place.countFood, text2 = place.maxCount})

		end

	end

	function this:collectDroppedCash(vPlayer, vBox, vTypeCash)
		if (vPlayer.isCollecting) then
			return
		end

		vPlayer.isCollecting = true

		timer.delay(TIME_COLLECT, false, function()
			vPlayer.isCollecting = false
		end)

		vBox.isLive = false

		local amount = this:getBankomatValue()
		amount = math.floor(amount * global.kf_coins_dropped)
		amount = math.ceil(amount / 10) * 10

		if (global.numMarket > 100) then
			amount = 100
		end

		lume.trace('Dropped Cash amount', amount)

		coinmanager.plus_balance(amount)
		

		local offY = 10 + #vPlayer.listCollectedFood * 25
		local pStart = vmath.vector3(vBox.pos.x, vBox.pos.y, 0)
		local pFinish = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + offY, 0)

		this:showFoodAnim(coinmanager.get_icon_name(), pStart, pFinish)

		vPlayer:playAudio('collect')

		msg.post(vBox.view, "remove")

	end

	function this:collectDroppedFood(vPlayer, vBox)
		if (vPlayer.isCollecting) then
			return
		end

		vPlayer.isCollecting = true

		timer.delay(TIME_COLLECT, false, function()
			vPlayer.isCollecting = false
		end)

		vBox.isLive = false
		table.insert(vPlayer.listCollectedFood, vBox.typeFood)

		msg.post(vPlayer.view, "food_add", {
			food = vBox.typeFood,
			count = #vPlayer.listCollectedFood,
			time = TIME_COLLECT
		})

		local offY = 10 + #vPlayer.listCollectedFood * 25
		local pStart = vmath.vector3(vBox.pos.x, vBox.pos.y, 0)
		local pFinish = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + offY, 0)
		this:showFoodAnim("food"..vBox.typeFood, pStart, pFinish)

		vPlayer:playAudio('collect')

		msg.post(vBox.view, "remove")

	end

	function this:collectFood(vPlayer, vBox, vIsSkipDelay)
		if (vPlayer.isCollecting) then
			return
		end

		if vIsSkipDelay then
			vPlayer.isCollecting = false
		else
			vPlayer.isCollecting = true

			timer.delay(TIME_COLLECT, false, function()
				vPlayer.isCollecting = false
			end)
		end

		vBox.countFood = vBox.countFood - 1

		table.insert(vPlayer.listCollectedFood, vBox.typeFood)

		msg.post(vPlayer.view, "food_add", {
			food = vBox.typeFood,
			count = #vPlayer.listCollectedFood,
			time = TIME_COLLECT
		})

		if vBox.linkFood then
			vBox:callCollect(vBox.linkFood, vBox.countFood)
		end

		local offY = 10 + #vPlayer.listCollectedFood * 25

		if vPlayer.isHaveBasket then
			offY = 100
		end

		local pStart = vmath.vector3(vBox.x, vBox.y, 0)

		if vBox.offsetGet then
			pStart.x = pStart.x + vBox.offsetGet.x
			pStart.y = pStart.y + vBox.offsetGet.y
		end

		if vBox.isSklad or vBox.isCaravan then
			if vBox.countFood >= vBox.maxCount then
				lume.trace('[ERROR] vBox.countFood >= vBox.maxCount')
			else
				local posFood = vBox.listFood[vBox.countFood + 1].pos
				pStart = vmath.vector3(posFood.x, posFood.y, 0)
			end
		end

		local pFinish = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + offY, 0)
		this:showFoodAnim("food"..vBox.typeFood, pStart, pFinish)

		vPlayer:playAudio('collect')

		if vPlayer.roleType == ROLE_BUYER or
			vPlayer.roleType == ROLE_STOCKMAN
		then
			vPlayer:updatePicking(vPlayer.roleType)
		end

		if this.isTutorial then
			if (vBox.typeFood == 1) and (this.stepTutorial == 2) then
				this.stepTutorial = 3
				this:updateTutorial()
			end
		end

	end

	function this:dropFood(vPlayer, vBox, vPosForAnim, vIndexFood, vSfxName)
		

		if (vPlayer.isCollecting) then
			return
		end

		if (vPosForAnim) then
			local index = #vPlayer.listCollectedFood

			if vIndexFood then
				index = vIndexFood
			end

			msg.post(vPlayer.view, "food_remove", {
				index = index
			})

			local offY = 10 + index * 25
			local pStart = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + offY, 0)
			local pFinish = vmath.vector3(vPosForAnim.x, vPosForAnim.y + 45, 0)
			this:showFoodAnim("food"..vPlayer.listCollectedFood[index], pStart, pFinish)

			local sfx_name = vSfxName or 'delete'
			vPlayer:playAudio(sfx_name)

			table.remove(vPlayer.listCollectedFood, index)
			vPlayer.isCollecting = true
		else
			if (vBox.countFood < vBox.maxCount) then
				local typeFood = vBox.typeFood
				local index = table.indexOfLast(vPlayer.listCollectedFood, typeFood)

				if (index > 0) and (typeFood == vBox.typeFood) then
					table.remove(vPlayer.listCollectedFood, index)
					vPlayer.isCollecting = true

					msg.post(vPlayer.view, "food_remove", {
						index = index
					})

					local posFinish = vBox.listFood[vBox.countFood + 1].pos

					local offY = 10 + index * 25
					local pStart = vmath.vector3(vPlayer.pos.x, vPlayer.pos.y + offY, 0)
					local pFinish = vmath.vector3(posFinish.x, posFinish.y, 0)
					this:showFoodAnim("food"..vBox.typeFood, pStart, pFinish)

					vBox.countFood = vBox.countFood + 1
					

					timer.delay(TIME_COLLECT, false, function()
						vBox:updateSklad(vBox.listFood, vBox.countFood, vBox.id)
					end)

					vPlayer:playAudio('stock')

					if this.isTutorial then
						if (vBox.typeFood == 1) and (this.stepTutorial == 3) then
							this.stepTutorial = 4
							this:updateTutorial()
						end
					end

					if vPlayer.roleType == ROLE_WORKER then
						if vBox and vBox.isForBuyer then
							quest_manager.checkQuest('fill_warehouse')
						end
					end
				end
			end
		end

		if vPlayer.isCollecting then
			timer.delay(TIME_COLLECT, false, function()
				vPlayer.isCollecting = false
			end)
		end

		if vPlayer.roleType == ROLE_WORKER then
			
			
			
			
			
			
			

		elseif vPlayer.roleType == ROLE_STOCKMAN then
			if #vPlayer.listCollectedFood == 0 then
				vPlayer:finishDrop()
			end

		end

	end

	
	function this:collectBanana(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		local viewFood = vLinkFood[1]
		if vCountFood == 0 then
			msg.post(viewFood, "hide")
		else
			msg.post(viewFood, "show")

			msg.post(viewFood, "updatePropsView", {frameName = "banana"..vCountFood})

			if vIsAdd then
				msg.post(viewFood, "setAddEffect", {time = 0.4})
				msg.post(vLinkTree, "setTreeEffect", {time = 0.4})

			end
		end

	end

	function this:collectMushroom(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		local viewFood = vLinkFood[1]
		if vCountFood == 0 then
			msg.post(viewFood, "hide")
		else
			msg.post(viewFood, "show")

			msg.post(viewFood, "updatePropsView", {frameName = "mushroom"..vCountFood})

			if vIsAdd then
				msg.post(viewFood, "setAddEffect", {time = 0.4})
			end
		end

	end

	
	function this:collectPlant(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		local viewFood = vLinkFood[1]
		if vCountFood == 0 then
			msg.post(viewFood, "hide")
		else
			msg.post(viewFood, "show")

			if vIsAdd then
				msg.post(viewFood, "setAddEffect", {time = 0.4})
				msg.post(vLinkTree, "setTreeEffect", {time = 0.4})
			end
		end

	end

	
	function this:collectTwoFood(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		if vCountFood == 0 then
			for i=1,2 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end
		else
			for i=1,2 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end

			for i=1,vCountFood do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "show")
				end
			end

			if vIsAdd then
				if vCountFood == 1 then
					msg.post(vLinkFood[1], "setAddEffect", {time = 0.4})
				end
				if vCountFood == 2 then
					msg.post(vLinkFood[2], "setAddEffect", {time = 0.4})
				end
				msg.post(vLinkTree, "setTreeEffect", {time = 0.4})
			end
		end

	end

	function this:collectThreeFood(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		if vCountFood == 0 then
			for i=1,3 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end
		else
			for i=1,3 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end

			for i=1,vCountFood do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "show")
				end
			end

			if vIsAdd then
				if vCountFood == 1 then
					msg.post(vLinkFood[1], "setAddEffect", {time = 0.4})
				end
				if vCountFood == 2 then
					msg.post(vLinkFood[2], "setAddEffect", {time = 0.4})
				end
				if vCountFood == 3 then
					msg.post(vLinkFood[3], "setAddEffect", {time = 0.4})
				end
				msg.post(vLinkTree, "setTreeEffect", {time = 0.4})
			end
		end

	end

	function this:collectPeanut(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		if vCountFood == 0 then
			msg.post(vLinkFood[1], "hide")
		else
			msg.post(vLinkFood[1], "show")

			if vIsAdd then
				msg.post(vLinkFood[1], "setAddEffect", {time = 0.4})
			end
		end

	end

	function this:updateViewFood(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		if vCountFood == 0 then
			for i=1,8 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end
		else
			for i=1,8 do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "hide")
				end
			end

			for i=1,vCountFood do
				if vLinkFood[i] then
					msg.post(vLinkFood[i], "show")
				end
			end

			if vIsAdd then
				msg.post(vLinkFood[vCountFood], "setAddEffect", {time = 0.4})
			end
		end

	end

	function this:collectSeafood(vLinkFood, vCountFood, vLinkTree, vIsAdd)
		if vCountFood == 0 then
			msg.post(vLinkFood[1], "hide")
		else
			msg.post(vLinkFood[1], "show")

			if vIsAdd then
				msg.post(vLinkFood[1], "setAddEffect", {time = 0.4})
				msg.post(vLinkFood[1], "finishMoveFish")
			end
		end

	end

	

	function this:initSkladCash(vX, vY, vType, vList, vPlaces)
		local posX = vX - 37 - 22
		local posY = vY - 50
		local posZ = this:getPosZ(vY)

		local arPosList		= {}

		local ofX = 48
		local ofY = 47

		arPosList = {
			{x = posX+ofX,	y = posY+ofY+16*0,	z = 0.0021},
			{x = posX+ofX,	y = posY+ofY+16*1,	z = 0.0022},
			{x = posX+ofX,	y = posY+ofY+16*2,	z = 0.0023},
			{x = posX+ofX,	y = posY+ofY+16*3,	z = 0.0024},
			{x = posX+ofX,	y = posY+ofY+16*4,	z = 0.0025},
			{x = posX+ofX,	y = posY+ofY+16*5,	z = 0.0026},
			{x = posX+ofX,	y = posY+ofY+16*6,	z = 0.0027},
			{x = posX+ofX,	y = posY+ofY+16*7,	z = 0.0028},
			{x = posX+ofX,	y = posY+ofY+16*8,	z = 0.0029},
			{x = posX+ofX,	y = posY+ofY+16*9,	z = 0.0030}
		}

		local frameCoin = coinmanager.get_icon_name()
		local frameList = coinmanager.get_cashlist_name()
		local boxed_food = nil

		for i=1,10 do
			boxed_food = this:addGraphicZavod({sprite=frameCoin, x = 0, y = 0, z = posZ})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(0,0,0)
			})
		end

		for k,v in pairs(arPosList) do
			boxed_food = this:addGraphicZavod({sprite=frameList, x = v.x, y = v.y, z = posZ + v.z})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		local h = 40
		local w = 30
		if (global.numMarket < 4) then
			table.insert(vPlaces, {isBusy = false, x = 80+w*0,	y = -30+h*0})
			table.insert(vPlaces, {isBusy = false, x = 80+w*2,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*4,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*5})
			table.insert(vPlaces, {isBusy = false, x = 80+w*6,	y = -30+h*6})
			table.insert(vPlaces, {isBusy = false, x = 80+w*7,	y = -30+h*7})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*8})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*9})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*9})
			table.insert(vPlaces, {isBusy = false, x = 80+w*11,	y = -30+h*8})
			table.insert(vPlaces, {isBusy = false, x = 80+w*12,	y = -30+h*7})
			table.insert(vPlaces, {isBusy = false, x = 80+w*11,	y = -30+h*6})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*5})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*7,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*6,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*0})
		elseif (global.numMarket == 4) or (global.numMarket == 5) or (global.numMarket == 6) or (global.numMarket == 101) then
			table.insert(vPlaces, {isBusy = false, x = 80+w*0,	y = -30+h*0})
			table.insert(vPlaces, {isBusy = false, x = 80+w*2,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*4,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*6,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*0})
			table.insert(vPlaces, {isBusy = false, x = 80+w*7,	y = -30+h*-1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*6,	y = -30+h*-2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*-3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*4,	y = -30+h*-4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*3,	y = -30+h*-5})
			table.insert(vPlaces, {isBusy = false, x = 80+w*2,	y = -30+h*-6})
			table.insert(vPlaces, {isBusy = false, x = 80+w*1,	y = -30+h*-7})
			table.insert(vPlaces, {isBusy = false, x = 80+w*0,	y = -30+h*-8})
			table.insert(vPlaces, {isBusy = false, x = 80+w*-1,	y = -30+h*-9})
			table.insert(vPlaces, {isBusy = false, x = 80+w*-2,	y = -30+h*-10})
		elseif (global.numMarket == 102) then
			table.insert(vPlaces, {isBusy = false, x = 80+w*0,	y = -30+h*0})
			table.insert(vPlaces, {isBusy = false, x = 80+w*2,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*4,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*5,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*6,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*7,	y = -30+h*5})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*6})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*6})
			table.insert(vPlaces, {isBusy = false, x = 80+w*11,	y = -30+h*5})
			table.insert(vPlaces, {isBusy = false, x = 80+w*11,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*0})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*-1})
			table.insert(vPlaces, {isBusy = false, x = 80+w*7,	y = -30+h*-2})
			table.insert(vPlaces, {isBusy = false, x = 80+w*8,	y = -30+h*-3})
			table.insert(vPlaces, {isBusy = false, x = 80+w*9,	y = -30+h*-4})
			table.insert(vPlaces, {isBusy = false, x = 80+w*10,	y = -30+h*-5})
		end

	end

	function this:updatePosBanknot(vListFood, vListStage)
		local vX = this.placeCashBox.x
		local vY = this.placeCashBox.y

		local posX = vX - 37 - 22
		local posY = vY - 50
		local posZ = this:getPosZ(vY - 16*vListStage)

		local w = 47
		local h = 25

		if (global.numMarket == 101) then
			posX = vX - 58
			posY = vY - 51
			w = 47
			h = 26
		end
		if (global.numMarket == 102) then
			posX = vX - 58 - 0.05
			posY = vY - 51 + 0.5
			w = 47
			h = 26
		end

		local arPosBanknot = {
			{x = posX+0*w+12*0,	y = posY+0*h-7*0,	z = 0.0025},
			{x = posX+1*w+12*0,	y = posY+0*h-7*1,	z = 0.0025},
			{x = posX+0*w+12*1,	y = posY+1*h-7*0,	z = 0.0024},
			{x = posX+1*w+12*1,	y = posY+1*h-7*1,	z = 0.0024},
			{x = posX+0*w+12*2,	y = posY+2*h-7*0,	z = 0.0023},
			{x = posX+1*w+12*2,	y = posY+2*h-7*1,	z = 0.0023},
			{x = posX+0*w+12*3,	y = posY+3*h-7*0,	z = 0.0022},
			{x = posX+1*w+12*3,	y = posY+3*h-7*1,	z = 0.0022},
			{x = posX+0*w+12*4,	y = posY+4*h-7*0,	z = 0.0021},
			{x = posX+1*w+12*4,	y = posY+4*h-7*1,	z = 0.0021}
		}

		local dataBanknot = nil

		for i=1,10 do
			dataBanknot = arPosBanknot[i]

			msg.post(vListFood[i].view,"setPosition",
			{
				x = dataBanknot.x,
				y = dataBanknot.y + 16*vListStage,
				z = posZ + (dataBanknot.z + i*0.00001)
			})
		end

	end

	function this:updateSkladCash(vListFood, vCountFood)
		for i, box in pairs(vListFood) do
			msg.post(box.view,"hide")
		end

		
		if this.placeCashBox then
			local count = math.floor(vCountFood / 10)
			if (count < 1000) then
				local countList = math.floor(count / 10)
				local countBanknots = count%10

				this:updatePosBanknot(vListFood, countList)

				if countBanknots > 0 then
					for i=1,countBanknots do
						msg.post(vListFood[i].view,"show")
					end
				end

				if countList > 0 then
					for i=1,countList do
						msg.post(vListFood[10+i].view,"show")
					end
				end
			else
				for i=1,10 do
					msg.post(vListFood[10+i].view,"show")
				end
			end
		end

	end

	

	function this:initSkladBanana(vX, vY, vType, vList, vPlaces)
		local posX = vX - 90 - 7
		local posY = vY - 24 - 18
		local posZ = this:getPosZ(vY)

		local w = 38

		local arPos = {
			{x = posX+0*40,	y = posY+0*w-7*0,	z = 0.0020},
			{x = posX+1*40,	y = posY+0*w-7*1,	z = 0.0020},
			{x = posX+2*40,	y = posY+0*w-7*2,	z = 0.0020},
			{x = posX+3*40,	y = posY+0*w-7*3,	z = 0.0020},
			{x = posX+4*40,	y = posY+0*w-7*4,	z = 0.0020},

			{x = posX+0*40+11,	y = posY+1*w-7*0,	z = 0.0021},
			{x = posX+1*40+11,	y = posY+1*w-7*1,	z = 0.0021},
			{x = posX+2*40+11,	y = posY+1*w-7*2,	z = 0.0021},
			{x = posX+3*40+11,	y = posY+1*w-7*3,	z = 0.0021},
			{x = posX+4*40+11,	y = posY+1*w-7*4,	z = 0.0021},

			{x = posX+0*40+22,	y = posY+2*w-7*0,	z = 0.0022},
			{x = posX+1*40+22,	y = posY+2*w-7*1,	z = 0.0022},
			{x = posX+2*40+22,	y = posY+2*w-7*2,	z = 0.0022},
			{x = posX+3*40+22,	y = posY+2*w-7*3,	z = 0.0022},
			{x = posX+4*40+22,	y = posY+2*w-7*4,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125})

	end

	

	function this:initSkladCorn(vX, vY, vType, vList, vPlaces)
		local posX = vX - 70 - 10
		local posY = vY - 35 - 20
		local posZ = this:getPosZ(vY - 35)

		local w = 55

		local arPos = {
			{x = posX+0*40,	y = posY+0*w-7*0,	z = 0.0023},
			{x = posX+1*40,	y = posY+0*w-7*1,	z = 0.0023},
			{x = posX+2*40,	y = posY+0*w-7*2,	z = 0.0023},
			{x = posX+3*40,	y = posY+0*w-7*3,	z = 0.0023},

			{x = posX+0*40+10,	y = posY+1*w-7*0,	z = 0.0022},
			{x = posX+1*40+10,	y = posY+1*w-7*1,	z = 0.0022},
			{x = posX+2*40+10,	y = posY+1*w-7*2,	z = 0.0022},
			{x = posX+3*40+10,	y = posY+1*w-7*3,	z = 0.0022},

			{x = posX+0*40+20,	y = posY+2*w-7*0,	z = 0.0021},
			{x = posX+1*40+20,	y = posY+2*w-7*1,	z = 0.0021},
			{x = posX+2*40+20,	y = posY+2*w-7*2,	z = 0.0021},
			{x = posX+3*40+20,	y = posY+2*w-7*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125})

	end

	function this:initSkladCornForEgg(vX, vY, vType, vList, vPlaces)
		local posX = vX - 25
		local posY = vY + 5
		local posZ = this:getPosZ(vY+50)

		local w = 25

		local arPos = {
			{x = posX+0*40+8*0,	y = posY+0*w-5*0,		z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1,		z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0,		z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1,		z = 0.0022},
			{x = posX+0*40+8*0,	y = posY+0*w-5*0+24,	z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1+24,	z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0+24,	z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1+24,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end


	end

	function this:initSkladMilk(vX, vY, vType, vList, vPlaces)
		local posX = vX - 51
		local posY = vY - 83
		local posZ = this:getPosZ(vY-70+1)

		local w = 55
		local h = 43

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-6*0,	z = 0.000023},
			{x = posX+1*h,	y = posY+0*w-6*1,	z = 0.000023},
			{x = posX+2*h,	y = posY+0*w-6*2,	z = 0.000023},

			{x = posX+0*h,	y = posY+1*w-6*0,	z = 0.000022},
			{x = posX+1*h,	y = posY+1*w-6*1,	z = 0.000022},
			{x = posX+2*h,	y = posY+1*w-6*2,	z = 0.000022},

			{x = posX+0*h,	y = posY+2*w-6*0,	z = 0.000021},
			{x = posX+1*h,	y = posY+2*w-6*1,	z = 0.000021},
			{x = posX+2*h,	y = posY+2*w-6*2,	z = 0.000021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.000001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100-50})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107-50})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114-50})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121-50})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120-50})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125-50})

	end

	function this:initSkladCornForMilk(vX, vY, vType, vList, vPlaces)
		local posX = vX - 25
		local posY = vY + 5
		local posZ = this:getPosZ(vY+50)

		local w = 25

		local arPos = {
			{x = posX+0*40+8*0,	y = posY+0*w-5*0,		z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1,		z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0,		z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1,		z = 0.0022},
			{x = posX+0*40+8*0,	y = posY+0*w-5*0+24,	z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1+24,	z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0+24,	z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1+24,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end


	end

	function this:initSkladPopCorn(vX, vY, vType, vList, vPlaces)
		local posX = vX - 60
		local posY = vY - 82
		local posZ1 = this:getPosZ(vY-70+1)
		local posZ2 = this:getPosZ(vY-70-1)

		
		
		
		

		local w = 12
		local h = 45

		local arPos = {
			{x = posX+0*h,		y = posY+12-7*0,	z = posZ1 + 0.000022},
			{x = posX+1*h,		y = posY+12-7*1,	z = posZ1 + 0.000022},
			{x = posX+2*h,		y = posY+12-7*2,	z = posZ1 + 0.000022},
			{x = posX+0*h+14,	y = posY+43-7*0,	z = posZ1 + 0.000021},
			{x = posX+1*h+14,	y = posY+43-7*1,	z = posZ1 + 0.000021},
			{x = posX+2*h+14,	y = posY+43-7*2,	z = posZ1 + 0.000021},

			{x = posX+0*h,		y = posY+12-7*0+85,	z = posZ2 + 0.000022},
			{x = posX+1*h,		y = posY+12-7*1+85,	z = posZ2 + 0.000022},
			{x = posX+2*h,		y = posY+12-7*2+85,	z = posZ2 + 0.000022},
			{x = posX+0*h+14,	y = posY+43-7*0+85,	z = posZ2 + 0.000021},
			{x = posX+1*h+14,	y = posY+43-7*1+85,	z = posZ2 + 0.000021},
			{x = posX+2*h+14,	y = posY+43-7*2+85,	z = posZ2 + 0.000021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = v.z})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100-15})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107-15})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114-15})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121-15})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120-15})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125-15})

	end

	function this:initSkladCornForPopCorn(vX, vY, vType, vList, vPlaces)
		local posX = vX - 140
		local posY = vY + 60 - 20
		local posZ = this:getPosZ(vY+50)

		local w = 25

		local arPos = {
			{x = posX+0*40+8*0,	y = posY+0*w-5*0,		z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1,		z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0,		z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1,		z = 0.0022},
			{x = posX+0*40+8*0,	y = posY+0*w-5*0+24,	z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1+24,	z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0+24,	z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1+24,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end


	end

	function this:initSkladYogurt(vX, vY, vType, vList, vPlaces)
		local posX = vX - 51
		local posY = vY - 86
		local posZ = this:getPosZ(vY-70+1)

		local w = 55
		local h = 43

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-6*0,	z = 0.000023},
			{x = posX+1*h,	y = posY+0*w-6*1,	z = 0.000023},
			{x = posX+2*h,	y = posY+0*w-6*2,	z = 0.000023},

			{x = posX+0*h,	y = posY+1*w-6*0,	z = 0.000022},
			{x = posX+1*h,	y = posY+1*w-6*1,	z = 0.000022},
			{x = posX+2*h,	y = posY+1*w-6*2,	z = 0.000022},

			{x = posX+0*h,	y = posY+2*w-6*0,	z = 0.000021},
			{x = posX+1*h,	y = posY+2*w-6*1,	z = 0.000021},
			{x = posX+2*h,	y = posY+2*w-6*2,	z = 0.000021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.000001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100-50})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107-50})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114-50})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121-50})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120-50})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125-50})

	end

	function this:initSkladBananaForYogurt(vX, vY, vType, vList, vPlaces)
		local posX = vX - 140
		local posY = vY + 65 - 20
		local posZ = this:getPosZ(vY+50)

		local w = 25

		local arPos = {
			{x = posX+0*40+8*0,	y = posY+0*w-5*0,		z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1,		z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0,		z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1,		z = 0.0022},
			{x = posX+0*40+8*0,	y = posY+0*w-5*0+20,	z = 0.0023},
			{x = posX+1*40+8*0,	y = posY+0*w-5*1+20,	z = 0.0023},
			{x = posX+0*40+8*1,	y = posY+1*w-5*0+20,	z = 0.0022},
			{x = posX+1*40+8*1,	y = posY+1*w-5*1+20,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end


	end

	function this:initSkladCocoa(vX, vY, vType, vList, vPlaces)
		local posX = vX - 91
		local posY = vY - 50
		local posZ = this:getPosZ(vY)

		local w = 40
		local h = 38
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0020},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0020},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0020},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0020},
			{x = posX+4*h,	y = posY+0*w-a*4,	z = 0.0020},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0021},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0021},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0021},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0021},
			{x = posX+4*h+11,	y = posY+1*w-a*4,	z = 0.0021},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0022},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0022},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0022},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0022},
			{x = posX+4*h+22,	y = posY+2*w-a*4,	z = 0.0022}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125})

	end

	function this:initSkladCoffeeBean(vX, vY, vType, vList, vPlaces)
		local posX = vX - 80
		local posY = vY - 55
		local posZ = this:getPosZ(vY)

		local w = 47
		local h = 43
		local a = 6
		local isFlip = true

		if (vType == 25) then
			posX = vX - 78
			posY = vY - 51
			isFlip = false
		end

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0023},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0022},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0022},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0022},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0022},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0021},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0021},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0021},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			if isFlip then
				msg.post(boxed_food, "updateFlip", { value = true} )
			end

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140})
	end

	function this:initSkladPeanut(vX, vY, vType, vList, vPlaces)
		local posX = vX - 100
		local posY = vY - 48
		local posZ = this:getPosZ(vY)

		local w = 38
		local h = 39
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0023},
			{x = posX+4*h,	y = posY+0*w-a*4,	z = 0.0023},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0022},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0022},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0022},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0022},
			{x = posX+4*h+11,	y = posY+1*w-a*4,	z = 0.0022},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0021},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0021},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0021},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0021},
			{x = posX+4*h+22,	y = posY+2*w-a*4,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			msg.post(boxed_food, "updateFlip", { value = true} )

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -110})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -117})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -124})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -131})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -130})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -135})

	end

	function this:initSkladCoffeeGround(vX, vY, vType, vList, vPlaces)
		local posX = vX - 60
		local posY = vY - 82
		local posZ1 = this:getPosZ(vY-70+1)
		local posZ2 = this:getPosZ(vY-70-1)

		local h = 45

		if (vType == 28) then
			posX = vX - 62
			posY = vY - 72
			h = 46
		end

		local arPos = {
			{x = posX+0*h,		y = posY+12-7*0,	z = posZ1 + 0.000021},
			{x = posX+1*h,		y = posY+12-7*1,	z = posZ1 + 0.000022},
			{x = posX+2*h,		y = posY+12-7*2,	z = posZ1 + 0.000023},
			{x = posX+0*h+10,	y = posY+40-7*0,	z = posZ1 + 0.000011},
			{x = posX+1*h+10,	y = posY+40-7*1,	z = posZ1 + 0.000012},
			{x = posX+2*h+10,	y = posY+40-7*2,	z = posZ1 + 0.000013},

			{x = posX-7+0*h,	y = posY+12-7*0+85,	z = posZ2 + 0.000021},
			{x = posX-7+1*h,	y = posY+12-7*1+85,	z = posZ2 + 0.000022},
			{x = posX-7+2*h,	y = posY+12-7*2+85,	z = posZ2 + 0.000023},
			{x = posX-7+0*h+10,	y = posY+40-7*0+85,	z = posZ2 + 0.000011},
			{x = posX-7+1*h+10,	y = posY+40-7*1+85,	z = posZ2 + 0.000012},
			{x = posX-7+2*h+10,	y = posY+40-7*2+85,	z = posZ2 + 0.000013}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = v.z})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100-15,	y = -100-25})
		table.insert(vPlaces, {isBusy = false, x = -50-15,	y = -107-25})
		table.insert(vPlaces, {isBusy = false, x = 50-15,	y = -114-25})
		table.insert(vPlaces, {isBusy = false, x = 100-15,	y = -121-25})
		table.insert(vPlaces, {isBusy = false, x = -25-15,	y = -120-25})
		table.insert(vPlaces, {isBusy = false, x = 25-15,	y = -125-25})
	end

	function this:initSkladPeanutButter(vX, vY, vType, vList, vPlaces)
		local posX = vX - 76
		local posY = vY - 45
		local posZ = this:getPosZ(vY)

		local w = 46
		local h = 42
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0023},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0022},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0022},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0022},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0022},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0021},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0021},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0021},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140})
	end

	function this:initSkladCappuccino(vX, vY, vType, vList, vPlaces)
		local posX = vX - 82
		local posY = vY - 51
		local posZ = this:getPosZ(vY - 35)

		local w = 62
		local h = 43

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-7*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-7*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-7*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-7*3,	z = 0.0023},

			{x = posX+0*h+10,	y = posY+1*w-7*0,	z = 0.0022},
			{x = posX+1*h+10,	y = posY+1*w-7*1,	z = 0.0022},
			{x = posX+2*h+10,	y = posY+1*w-7*2,	z = 0.0022},
			{x = posX+3*h+10,	y = posY+1*w-7*3,	z = 0.0022},

			{x = posX+0*h+20,	y = posY-2+2*w-7*0,	z = 0.0021},
			{x = posX+1*h+20,	y = posY-2+2*w-7*1,	z = 0.0021},
			{x = posX+2*h+20,	y = posY-2+2*w-7*2,	z = 0.0021},
			{x = posX+3*h+20,	y = posY-2+2*w-7*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140})
	end

	function this:initSkladChocolateBar(vX, vY, vType, vList, vPlaces)
		local posX = vX - 74
		local posY = vY - 35
		local posZ = this:getPosZ(vY-36)

		local w = 36
		local h = 13
		local a = 6

		if (vType == 24) then
			posX = vX - 75
			posY = vY - 27
			a = 7
		end

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0024},
			{x = posX+1*h,	y = posY+1*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+2*w-a*2,	z = 0.0022},
			{x = posX+3*h,	y = posY+3*w-a*3,	z = 0.0021},

			{x = posX+0*h+55,	y = posY+0*w-a*0-37,	z = 0.0024},
			{x = posX+1*h+55,	y = posY+1*w-a*1-37,	z = 0.0023},
			{x = posX+2*h+55,	y = posY+2*w-a*2-37,	z = 0.0022},
			{x = posX+3*h+55,	y = posY+3*w-a*3-37,	z = 0.0021},

			{x = posX+0*h+110,	y = posY+0*w-a*0-74,	z = 0.0024},
			{x = posX+1*h+110,	y = posY+1*w-a*1-74,	z = 0.0023},
			{x = posX+2*h+110,	y = posY+2*w-a*2-74,	z = 0.0022},
			{x = posX+3*h+110,	y = posY+3*w-a*3-74,	z = 0.0021},
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115-45})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122-45})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129-45})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136-45})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135-45})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140-45})
	end

	function this:initSkladMuffin(vX, vY, vType, vList, vPlaces)
		local posX = vX - 80
		local posY = vY - 47
		local posZ = this:getPosZ(vY)

		local w = 47
		local h = 43
		local a = 7

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0023},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0022},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0022},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0022},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0022},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0021},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0021},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0021},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140})
	end

	function this:initSkladButter(vX, vY, vType, vList, vPlaces)
		local posX = vX - 60
		local posY = vY - 88
		local posZ1 = this:getPosZ(vY-70+1)
		local posZ2 = this:getPosZ(vY-70-1)

		local w = 12
		local h = 46

		local arPos = {
			{x = posX+0*h,		y = posY+12-7*0,	z = posZ1 + 0.000021},
			{x = posX+1*h,		y = posY+12-7*1,	z = posZ1 + 0.000022},
			{x = posX+2*h,		y = posY+12-7*2,	z = posZ1 + 0.000023},
			{x = posX+0*h+10,	y = posY+40-7*0,	z = posZ1 + 0.000011},
			{x = posX+1*h+10,	y = posY+40-7*1,	z = posZ1 + 0.000012},
			{x = posX+2*h+10,	y = posY+40-7*2,	z = posZ1 + 0.000013},

			{x = posX-7+0*h,	y = posY+12-7*0+87,	z = posZ2 + 0.000021},
			{x = posX-7+1*h,	y = posY+12-7*1+87,	z = posZ2 + 0.000022},
			{x = posX-7+2*h,	y = posY+12-7*2+87,	z = posZ2 + 0.000023},
			{x = posX-7+0*h+10,	y = posY+40-7*0+87,	z = posZ2 + 0.000011},
			{x = posX-7+1*h+10,	y = posY+40-7*1+87,	z = posZ2 + 0.000012},
			{x = posX-7+2*h+10,	y = posY+40-7*2+87,	z = posZ2 + 0.000013}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = v.z})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100-15,	y = -100-25})
		table.insert(vPlaces, {isBusy = false, x = -50-15,	y = -107-25})
		table.insert(vPlaces, {isBusy = false, x = 50-15,	y = -114-25})
		table.insert(vPlaces, {isBusy = false, x = 100-15,	y = -121-25})
		table.insert(vPlaces, {isBusy = false, x = -25-15,	y = -120-25})
		table.insert(vPlaces, {isBusy = false, x = 25-15,	y = -125-25})
	end

	function this:initSkladIceCream(vX, vY, vType, vList, vPlaces)
		local posX = vX - 80
		local posY = vY - 20
		local posZ = this:getPosZ(vY-5+1)

		local w = 30
		local h = 46
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.00003},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.00003},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.00003},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.00003},

			{x = posX+0*h+13,	y = posY+1*w-a*0,	z = 0.00002},
			{x = posX+1*h+13,	y = posY+1*w-a*1,	z = 0.00002},
			{x = posX+2*h+13,	y = posY+1*w-a*2,	z = 0.00002},
			{x = posX+3*h+13,	y = posY+1*w-a*3,	z = 0.00002},

			{x = posX+0*h+26,	y = posY+2*w-a*0,	z = 0.00001},
			{x = posX+1*h+26,	y = posY+2*w-a*1,	z = 0.00001},
			{x = posX+2*h+26,	y = posY+2*w-a*2,	z = 0.00001},
			{x = posX+3*h+26,	y = posY+2*w-a*3,	z = 0.00001}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.000001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100-5})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107-5})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114-5})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121-5})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120-5})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125-5})

	end

	function this:initSkladCracker(vX, vY, vType, vList, vPlaces)
		local posX = vX - 70
		local posY = vY - 60
		local posZ = this:getPosZ(vY)

		local w = 47
		local h = 40
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.0023},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.0023},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.0023},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.0023},

			{x = posX+0*h+11,	y = posY+1*w-a*0,	z = 0.0022},
			{x = posX+1*h+11,	y = posY+1*w-a*1,	z = 0.0022},
			{x = posX+2*h+11,	y = posY+1*w-a*2,	z = 0.0022},
			{x = posX+3*h+11,	y = posY+1*w-a*3,	z = 0.0022},

			{x = posX+0*h+22,	y = posY+2*w-a*0,	z = 0.0021},
			{x = posX+1*h+22,	y = posY+2*w-a*1,	z = 0.0021},
			{x = posX+2*h+22,	y = posY+2*w-a*2,	z = 0.0021},
			{x = posX+3*h+22,	y = posY+2*w-a*3,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -115})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -122})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -129})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -136})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -135})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -140})
	end

	function this:initSkladSoyaBean(vX, vY, vType, vList, vPlaces)
		local posX = vX - 94
		local posY = vY - 42
		local posZ = this:getPosZ(vY)

		local w = 38
		local h = 39
		local a = 6

		local arPos = {
		    {x = posX+0*w,	y = posY+0*h-a*0,	z = 0.0023},
		    {x = posX+1*w,	y = posY+0*h-a*1,	z = 0.0023},
		    {x = posX+2*w,	y = posY+0*h-a*2,	z = 0.0023},
		    {x = posX+3*w,	y = posY+0*h-a*3,	z = 0.0023},
		    {x = posX+4*w,	y = posY+0*h-a*4,	z = 0.0023},

		    {x = posX+0*w+11,	y = posY+1*h-a*0,	z = 0.0022},
		    {x = posX+1*w+11,	y = posY+1*h-a*1,	z = 0.0022},
		    {x = posX+2*w+11,	y = posY+1*h-a*2,	z = 0.0022},
		    {x = posX+3*w+11,	y = posY+1*h-a*3,	z = 0.0022},
		    {x = posX+4*w+11,	y = posY+1*h-a*4,	z = 0.0022},

		    {x = posX+0*w+22,	y = posY+2*h-a*0,	z = 0.0021},
		    {x = posX+1*w+22,	y = posY+2*h-a*1,	z = 0.0021},
		    {x = posX+2*w+22,	y = posY+2*h-a*2,	z = 0.0021},
		    {x = posX+3*w+22,	y = posY+2*h-a*3,	z = 0.0021},
		    {x = posX+4*w+22,	y = posY+2*h-a*4,	z = 0.0021}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.00001)})
			msg.post(boxed_food, "updateFlip", {value = true})

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -110})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -117})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -124})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -131})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -130})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -135})

	end

	function this:initSkladShrimp(vX, vY, vType, vList, vPlaces)
		local posX = vX - 80
		local posY = vY - 20
		local posZ = this:getPosZ(vY-5+1)

		local w = 30
		local h = 46
		local a = 6

		local arPos = {
			{x = posX+0*h,	y = posY+0*w-a*0,	z = 0.00003},
			{x = posX+1*h,	y = posY+0*w-a*1,	z = 0.00003},
			{x = posX+2*h,	y = posY+0*w-a*2,	z = 0.00003},
			{x = posX+3*h,	y = posY+0*w-a*3,	z = 0.00003},

			{x = posX+0*h+13,	y = posY+1*w-a*0,	z = 0.00002},
			{x = posX+1*h+13,	y = posY+1*w-a*1,	z = 0.00002},
			{x = posX+2*h+13,	y = posY+1*w-a*2,	z = 0.00002},
			{x = posX+3*h+13,	y = posY+1*w-a*3,	z = 0.00002},

			{x = posX+0*h+26,	y = posY+2*w-a*0,	z = 0.00001},
			{x = posX+1*h+26,	y = posY+2*w-a*1,	z = 0.00001},
			{x = posX+2*h+26,	y = posY+2*w-a*2,	z = 0.00001},
			{x = posX+3*h+26,	y = posY+2*w-a*3,	z = 0.00001}
		}

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = posZ + (v.z + k*0.000001)})
			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100,	y = -100-5})
		table.insert(vPlaces, {isBusy = false, x = -50,		y = -107-5})
		table.insert(vPlaces, {isBusy = false, x = 50,		y = -114-5})
		table.insert(vPlaces, {isBusy = false, x = 100,		y = -121-5})
		table.insert(vPlaces, {isBusy = false, x = -25,		y = -120-5})
		table.insert(vPlaces, {isBusy = false, x = 25,		y = -125-5})

	end

	function this:initSkladFish(vX, vY, vType, vList, vPlaces)
		local posX = vX - 42
		local posY = vY - 68
		local posZ1 = this:getPosZ(vY-30+1)
		local posZ2 = this:getPosZ(vY-30-1)

		local h = 7
		local w = 46
		local a = 6
		local y1 = 12
		local y2 = 70

		local arPos = {
			{x = posX-85+0*w,		y = posY+y1-a*0+26,	z = posZ1 + 0.000022},
			{x = posX-85+1*w,		y = posY+y1-a*1+26,	z = posZ1 + 0.000022},
			{x = posX-85+2*w,		y = posY+y1-a*2+26,	z = posZ1 + 0.000022},
			{x = posX-85+3*w,		y = posY+y1-a*3+26,	z = posZ1 + 0.000022},
			{x = posX-85+4*w,		y = posY+y1-a*4+26,	z = posZ1 + 0.000022},
			{x = posX-85+5*w,		y = posY+y1-a*5+26,	z = posZ1 + 0.000022},

			{x = posX-65+0*w,		y = posY+y2-a*0+26,	z = posZ1 + 0.000021},
			{x = posX-65+1*w,		y = posY+y2-a*1+26,	z = posZ1 + 0.000021},
			{x = posX-65+2*w,		y = posY+y2-a*2+26,	z = posZ1 + 0.000021},
			{x = posX-65+3*w,		y = posY+y2-a*3+26,	z = posZ1 + 0.000021},
			{x = posX-65+4*w,		y = posY+y2-a*4+26,	z = posZ1 + 0.000021},
			{x = posX-65+5*w,		y = posY+y2-a*5+26,	z = posZ1 + 0.000021}
		}

		local boxed_food = nil
		local z = 0

		local pStart = vmath.vector3(posX, posY, 0)
		local p = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addAnimal(v.x, v.y, 'fish1', v.z)

			
			
			
			
			
			
			

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(posX,posY+80,0)
			})
		end

		table.insert(vPlaces, {isBusy = false, x = -100-20,		y = -100-5})
		table.insert(vPlaces, {isBusy = false, x = -50-20,		y = -107-5})
		table.insert(vPlaces, {isBusy = false, x = 50-20,		y = -114-5})
		table.insert(vPlaces, {isBusy = false, x = 100-20,		y = -121-5})
		table.insert(vPlaces, {isBusy = false, x = -25-20,		y = -120-5})
		table.insert(vPlaces, {isBusy = false, x = 25-20,		y = -125-5})

	end

	

	function this:getLinePoint(vPoint, vAngle, vLengthStep, vMaxStep, vValue)
		local p = vmath.vector3()
		local r = vValue or math.random(0,vMaxStep)

		local angle = math.rad(vAngle)
		p.x = vPoint.x + utils.round(r*vLengthStep * math.cos(angle))
		p.y = vPoint.y + utils.round(r*vLengthStep * math.sin(angle))

		return p
	end

	

	function this:initViewSkladBig(vTypeSklad, vX, vY, vType, vList, vPlaces, vOffsetSklad)
		local data = dataSklad.getSkladPositionsFood(vTypeSklad, vType)

		if (data == nil) then
			lume.trace('[ WARNING ] dataSklad is NIL. vTypeSklad:',vTypeSklad)
			return
		end

		local koefZ = data.koefZ
		local posX = vX + data.posOffset.x
		local posY = vY + data.posOffset.y
		local posZ = this:getPosZ(vY + data.posOffset.z)

		local boxed_food = nil

	    for k,v in pairs(data.arPos) do
	        boxed_food = this:addGraphicZavod({
				sprite = "food"..vType,
				x = posX + v.x,
				y = posY + v.y,
				z = posZ + (v.z + k*koefZ)
			})

			if data.isFlip then
	        	msg.post(boxed_food, "updateFlip", {value = true})
			end

	        table.insert(vList, {
	            view = boxed_food,
	            pos = vmath.vector3(posX + v.x, posY + v.y, 0)
	        })
	    end

		for k,v in pairs(data.arPlaces) do
			table.insert(vPlaces, {isBusy = false, x = v.x,	y = v.y})
		end

		return {
			offsetBuy = data.offsetBuy
		}
	end

	
	function this:initViewSkladSmall(vTypeSklad, vX, vY, vType, vList, vPlaces, vOffsetSklad)
		local posX = vX
		local posY = vY
		local posZ = this:getPosZ(vY)

		if vOffsetSklad then
			posX = posX + vOffsetSklad.x
			posY = posY + vOffsetSklad.y
		end

		local arPos, isFlip = dataSklad.getData(vmath.vector3(posX,posY,posZ), vType)

		local boxed_food = nil

		for k,v in pairs(arPos) do
			boxed_food = this:addGraphicZavod({sprite="food"..vType, x = v.x, y = v.y, z = v.z})

			if isFlip then
				msg.post(boxed_food, "updateFlip", { value = true} )
			end

			table.insert(vList, {
				view = boxed_food,
				pos = vmath.vector3(v.x,v.y,0)
			})
		end

	end

	

	function this:upgradeZavod(vId, vValue)
		local place = this.listPlaceBoxes[vId]
		place.maxCount = vValue

		
		
		

	end

	function this:upgradeSklad(vId, vValue)
		local place = this.listPlaceBoxes[vId]
		place.maxCount = vValue

		
		

		this:updateSklad(place.listFood, place.countFood, place.id)

	end

	

	
	function this:clearFood(vPlayer, vPos)
		local count = #vPlayer.listCollectedFood

		if (count > 0) then
			this:dropFood(vPlayer, vBox, vPos)
		end

	end

	
	function this:getAvailableSklad(vSkladId)
		local list = {}

		local placesSkladsId = this.listWarehouses
		local sklad_id = 0

		for k,v in pairs(placesSkladsId) do
			sklad_id = this.dataMart.PLACES[v].id
			if (this.listPlaceBoxes[sklad_id].countFood > 1) then
				table.insert(list, this.listPlaceBoxes[sklad_id].nameFood)
			end
		end

		if #list == 0 then
			list = {this.listPlaceBoxes[this.dataMart.PLACES[gameState.defauiltSklad].id].nameFood}
		end

		utils.shuffle(list)

		if vSkladId then
			list = {this.listPlaceBoxes[placesSkladsId[vSkladId]].nameFood}
		end

		

		return list[1]
	end
	
	function this:checkOverloadWarehouses()
		
		local isSkip = false
		local skip_food = {}
		local chance_skip = 0.7
		local count_buyers = 4
		local placesSkladsId = this.listWarehouses
		local countBusy = 0
		local sklad_id = 0
		local sklad = nil

		for k,v in pairs(placesSkladsId) do
			sklad_id = this.dataMart.PLACES[v].id
			sklad = this.listPlaceBoxes[sklad_id]
			countBusy = 0

			if (sklad.isActive and sklad.places) then
				for i=1,6 do
					if(sklad.places[i].isBusy) then
						countBusy = countBusy + 1
					end
				end

				if (countBusy >= count_buyers) then
					table.insert(skip_food, sklad.typeFood)
				end

				
			end
		end

		if (#skip_food > 0) then
			
			isSkip = math.random() < chance_skip
		end

		
		
		

		return isSkip, skip_food
	end

	function this:getWishList(vData)
		local vIsFunSquad		= vData.isFunSquad
		local vIsCountWishList	= vData.countWishrow
		local isBuyerPunch		= vData.isBuyerPunch

		local wishList = {}
		local skip_food = {}
		local isSkipFood = false

		if (not vIsFunSquad) then
			isSkipFood, skip_food = this:checkOverloadWarehouses()
		end

		local typesFood, maxWishList, maxFood = this.dataMart:getWishList()
		local count_skalds = #typesFood
		

		if (count_skalds == 0) then
			return
		end

		if (#skip_food == count_skalds) then
			
			isSkipFood = false
		end

		if (count_skalds > 1) and (isSkipFood) then
			for k,v in pairs(skip_food) do
				lume.remove(typesFood, v)
			end

			maxWishList = #typesFood
		end

		if maxWishList < 1 then
			maxWishList = 1
		end

		local r_wishrow = math.random(maxWishList)

		if vIsCountWishList then
			r_wishrow = vIsCountWishList
		end

		if this.isTutorial then
			typesFood = {1}
			maxFood = 1
			r_wishrow = 1
		elseif vIsFunSquad then
			typesFood = {this.typeFoodForFun}
			maxFood = 1
			r_wishrow = 1
		end

		if isBuyerPunch then
			maxFood = 3
			r_wishrow = math.random(1,2)
		end

		utils.shuffle(typesFood)

		
		

		if (r_wishrow > #typesFood) then
			r_wishrow = #typesFood
			lume.trace('[ WARNING ] DETECT r_wishrow > #typesFood')
		end

		local availableCount = math.random(r_wishrow,maxFood)

		
		
		

		
		
		

		local typeFood = 0
		local maxCountFood = 0
		local maxTypeFood = global.maxTypeFood
		local r_count = 1

		if r_wishrow > 1 then
			for i=1,r_wishrow-1 do
				if availableCount > 0 then
					typeFood = typesFood[i]
					maxCountFood = maxTypeFood[typeFood]

					if (availableCount <= maxCountFood) then
						r_count = math.random(availableCount)
					else
						if (table.indexOf(global.easyTypeFood, typeFood) > 0) then
							r_count = lume.weightedchoice({ [1] = 2, [2] = 3, [3] = 3, [4] = 2, [5] = 1 })
						else
							if (table.indexOf(global.complexTypeFood, typeFood) > 0) then
								r_count = lume.weightedchoice({ [1] = 3, [2] = 2})
							else
								r_count = lume.weightedchoice({ [1] = 2, [2] = 3, [3] = 1 })
							end
						end
					end

					if (not r_count) then
						r_count = 1
					end

					table.insert(wishList, {type = typeFood, count = r_count})
					availableCount = availableCount - r_count
				end
			end
		end

		if availableCount > 0 then
			maxCountFood = maxTypeFood[typesFood[r_wishrow]]

			if availableCount > maxCountFood then
				
				availableCount = maxCountFood
			end
			table.insert(wishList, {type = typesFood[r_wishrow], count = availableCount})
		end

		
		
		
		
		
		
		
		

		

		return wishList

	end

	function this:addNewBuyer(vPlayer, vIsFunSquad)
		vPlayer.isReadyBuy = true

		vPlayer:updateVisible(true)
		vPlayer:showEffectExit()

		vPlayer:initAction()

		local numSkin = 1 + math.random(6)
		local numHat = lume.randomchoice({0,12,13,14,15,16,17,18,19,20})

		if (global.numMarket == 101) then
			numHat = lume.randomchoice({0,12,13,14,15,16,17,18,19,20, 33,34,35,36,37})
		end
		if (global.numMarket == 102) then
			numHat = lume.randomchoice({40,41,42,43,44})
		end

		local wishList = this:getWishList({isFunSquad = vIsFunSquad})
		vPlayer:initWishFood(wishList)

		if vIsFunSquad then
			numHat = this.typeHatForFun
			vPlayer.isReadyBuy = false
		end

		vPlayer:updateSkin('monkey'..numSkin)
		vPlayer:updateHat(numHat)

	end

	function this:addBuyerPunch(vPlayer)
		if (vPlayer.isAlive) then
			return
		end

		vPlayer:updateVisible(true)
		vPlayer:showEffectExit()

		vPlayer:initAction()

		local wishList = this:getWishList({isBuyerPunch = true})
		vPlayer:initWishFood(wishList)

		vPlayer:updateSkin('monkey'..4)
		vPlayer:updateHat(0)

		msg.post(this.dodikPunch.view, "setToyPunch", { bool = true} )
		msg.post(this.toyPunchForMonkeyPunch, "set_follower", { id = this.dodikPunch.id })
		msg.post(this.toyPunchForMonkeyPunch, "show")

	end

	function this:hideBuyerPunch()
		msg.post(this.toyPunchForMonkeyPunch, "remove_follower")
		msg.post(this.toyPunchForMonkeyPunch, "hide")

	end

	function this:addHooligan(vPlayer)
		if (vPlayer.isAlive) or (not this.listPlaceBoxes[this.dataMart.NUMPLACE_MIN].isActive) then
			return
		end

		this.isAllowHooligan = false

		vPlayer:updateVisible(true)
		vPlayer:showEffectExit()
		vPlayer:initAction()
		vPlayer:startHooligan()

		local n = 1 + math.random(6)
		vPlayer:updateSkin('monkey'..n)

		local r = lume.randomchoice({0,12,13,14,15,16,17,18,19,20})

		if (global.numMarket == 101) then
			r = lume.randomchoice({0,12,13,14,15,16,17,18,19,20, 33,34,35,36,37})
		end
		if (global.numMarket == 102) then
			r = lume.randomchoice({40,41,42,43,44})
		end

		vPlayer:updateHat(r)

	end

	
	function this:updateCaravan(vId)
		local box = this.listPlaceBoxes[vId]

		if box.workState == 0 then
			this:setCaravanState(box.id, 1)

		elseif box.workState == 1 then
			box.workTick = box.workTick + 1

			if box.workTick > box.workReload then
				this:setCaravanState(box.id, 2)
				box.workTick = 0
			end

		elseif box.workState == 2 then
			box.workTick = box.workTick + 1

			if box.workTick > 3 then
				this:setCaravanState(box.id, 3)
				box.workTick = 0
			end

		elseif box.workState == 3 then
			box.workTick = box.workTick + 1

			if (box.workTick > 3) and (box.countFood == 0) then
				this:setCaravanState(box.id, 4)
				box.workTick = 0
			end

		elseif box.workState == 4 then
			box.workTick = box.workTick + 1

			if box.workTick > 1 then
				this:setCaravanState(box.id, 5)
				box.workTick = 0
			end

		elseif box.workState == 5 then
			box.workTick = box.workTick + 1

			if box.workTick > 2 then
				this:setCaravanState(box.id, 0)
				box.workTick = 0
			end

		end

	end

	function this:setCaravanState(vId, vState)
		local box = this.listPlaceBoxes[vId]

		box.workState = vState

		if vState == 0 then			
			
			box.listPoints.isDisable = true

			msg.post(box.graphic, "hide")

		elseif vState == 1 then		

		elseif vState == 2 then		
			local timeShow = 1.9

			local offsetDrive = box.offsetDrive
			local pStart = vmath.vector3(box.pos.x + offsetDrive.x, box.pos.y + offsetDrive.y, 0)
			local pFinish = vmath.vector3(box.pos.x, box.pos.y, 0)
			msg.post(box.graphic, "moveCar", {start = pStart, finish = pFinish, time = timeShow})

		elseif vState == 3 then		
			
			box.listPoints.isDisable = false

			msg.post(box.graphic, "updateCaravan", {state = 0})

			box.countFood = box.maxCount
			box:callCollect(box.linkFood, box.countFood)

			this:checkInsidePlace('player', this.ourPlayer.pos, box.id)

		elseif vState == 4 then		

		elseif vState == 5 then		
			
			box.listPoints.isDisable = true

			msg.post(box.graphic, "updateCaravan", {state = 1})

			local timeShow = 1.9

			local offsetDrive = box.offsetDrive
			local pStart = vmath.vector3(box.pos.x, box.pos.y, 0)
			local pFinish = vmath.vector3(box.pos.x + offsetDrive.x, box.pos.y + offsetDrive.y, 0)
			msg.post(box.graphic, "moveCar", {start = pStart, finish = pFinish, time = timeShow})

			addEffect("top", "effect_exit", vmath.vector3(box.x - 10, box.y - 50, DEEP_EFFECT))

		end

	end

	

	function this:addZavodObject(vType, vIdPlaceMain, vIdPlace1, vIdPlace2, vNamePlace)
		if (vType == 'cow') or (vType == 'chicken') or (vType == 'pig') then
			local boxPlace1 = this.listPlaceBoxes[vIdPlace1]
			local pos = vmath.vector3(boxPlace1.x, boxPlace1.y, 0)

			local offsetView = vmath.vector3(77, 50, 0)
			local typeFrame = vType..'1'

			if (vType == 'cow') then
				offsetView = vmath.vector3(77, 50, 0)
			elseif (vType == 'chicken') then
				offsetView = vmath.vector3(43, 58, 0)
			elseif (vType == 'pig') then
				offsetView = vmath.vector3(30, 74, 0)
			end

			if boxPlace1.offsetView then
				offsetView.x = boxPlace1.offsetView.x
				offsetView.y = boxPlace1.offsetView.y
			end

			local object = {
				name		= vType,
				type		= 'animal',
				view		= nil,
				cloud		= nil,
				boost		= nil,
				panel		= nil,
				pos			= vmath.vector3(pos.x + offsetView.x, pos.y + offsetView.y, 0),
				isSleeping	= false,
				audioTick	= 0,
				radius		= 7000,
				placeId		= vIdPlaceMain
			}

			if vNamePlace then
				object.name = vNamePlace
			end

			object.view = this:addAnimal(object.pos.x, object.pos.y, typeFrame)
			msg.post(object.view, "updateVisible", { value = false} )

			if boxPlace1.flipView then
				msg.post(object.view, "updateFlip", { value = true} )
			end

			object.cloud = addCloudZavod(vmath.vector3(object.pos.x, object.pos.y, DEEP_CURSOR))
			msg.post(object.cloud.root, "setType", {type = 1})
			msg.post(object.cloud.root, "hide")

			local place = this.listPlaceBoxes[vIdPlace1]
			local offsetPlaha = vmath.vector3()

			if place.offsetPlaha then
				offsetPlaha = place.offsetPlaha
			end

			local point = vmath.vector3(place.x-50+offsetPlaha.x, place.y+90+offsetPlaha.y, DEEP_DUST)
			object.panel = addFactoryPanelZavod(point)
			msg.post(object.panel.root, "updateIcon", {type = boxPlace1.typeFood})
			msg.post(object.panel.root, "updateText", {text1 = place.countFood, text2 = place.maxCount})
			msg.post(object.panel.root, "hide")

			pos = vmath.vector3(object.pos.x, object.pos.y+35, 0)
			posZ = this:getPosZ(pos.y-50)

			local newEffect = addFactorySpine({factoryName='#factoryEffectSpine',x=pos.x, y=pos.y, z=posZ})
			local linkRoot = newEffect.root

			msg.post(linkRoot, "setScale", {value = 2.0})
			msg.post(linkRoot, "playAnim", {name = "effect_aura3", loop = true} )
			msg.post(linkRoot, "updateVisible", { value = false} )

			object.boost = linkRoot

			this.listPlaceBoxes[vIdPlace1].objectPanel = object.panel
			this.listPlaceBoxes[vIdPlace1].objectBoost = object
			this.listPlaceBoxes[vIdPlaceMain].objectBoost = object

			table.insert(this.listZavodObjects, object)

		else
			local x = this.listPlaceBoxes[vIdPlace1].x
			local y = this.listPlaceBoxes[vIdPlace1].y + 10

			local object = {
				name		= vType,
				type		= 'machine',
				cloud		= nil,
				boost		= nil,
				panel		= nil,
				panel2		= nil,
				pos			= vmath.vector3(x, y, 0),
				isSleeping	= false,
				radius		= 18000,
				placeId		= vIdPlaceMain
			}

			local offsetBoost = vmath.vector3()

			place = this.listPlaceBoxes[vIdPlaceMain]
			if place.offsetBoost then
				offsetBoost = place.offsetBoost
			end

			object.cloud = addCloudZavod(vmath.vector3(object.pos.x + offsetBoost.x, object.pos.y, DEEP_CURSOR))
			msg.post(object.cloud.root, "setType", {type = 2})
			msg.post(object.cloud.root, "hide")

			local place = this.listPlaceBoxes[vIdPlace1]

			local offsetPlaha = vmath.vector3()

			if place.offsetPlaha then
				offsetPlaha = place.offsetPlaha
			end

			local point = vmath.vector3(x-140+offsetPlaha.x, y+125+offsetPlaha.y, DEEP_DUST)
			object.panel = addFactoryPanelZavod(point)
			msg.post(object.panel.root, "updateIcon", {type = place.typeFood})
			msg.post(object.panel.root, "updateText", {text1 = place.countFood, text2 = place.maxCount})
			msg.post(object.panel.root, "hide")

			
			if vIdPlace2 then
				place = this.listPlaceBoxes[vIdPlace2]
				offsetPlaha = vmath.vector3()
				if place.offsetPlaha then
					offsetPlaha = place.offsetPlaha
				end
				local point = vmath.vector3(x-140+offsetPlaha.x, y+125+offsetPlaha.y, DEEP_DUST)
				object.panel2 = addFactoryPanelZavod(point)
				msg.post(object.panel2.root, "updateIcon", {type = place.typeFood})
				msg.post(object.panel2.root, "updateText", {text1 = place.countFood, text2 = place.maxCount})
				msg.post(object.panel2.root, "hide")

				this.listPlaceBoxes[vIdPlace2].objectPanel = object.panel2
				this.listPlaceBoxes[vIdPlace2].objectBoost = object
			end

			pos = vmath.vector3(object.pos.x-5+offsetBoost.x, object.pos.y+40+offsetBoost.y, 0)
			posZ = this:getPosZ(pos.y-60)

			local newEffect = addFactorySpine({factoryName='#factoryEffectSpine',x=pos.x, y=pos.y, z=posZ})
			local linkRoot = newEffect.root

			msg.post(linkRoot, "setScale", {value = 2.0})
			msg.post(linkRoot, "playAnim", {name = "effect_aura3", loop = true} )
			msg.post(linkRoot, "updateVisible", { value = false} )

			object.boost = linkRoot

			this.listPlaceBoxes[vIdPlace1].objectPanel = object.panel
			this.listPlaceBoxes[vIdPlace1].objectBoost = object

			this.listPlaceBoxes[vIdPlaceMain].objectBoost = object

			table.insert(this.listZavodObjects, object)

		end

	end

	function this:initUpgradeFeature()
		local box = nil
		local pos = nil
		
		local listIds = this.dataMart.listUpgradesId
		local amountUpgrades = this.dataMart.countUpgrades

		for i=2,amountUpgrades do
			box = gameState.listPlaceBoxes[listIds[i]]

			if box.objectBoost then
				this:addUpgradeFeature(i, box.objectBoost.name, box.id, box.pos)
			else
				local tileDodik = this:getTileFromPos(box.pos.x, box.pos.y)
				local posDodik = this:getPosFromTile(tileDodik.x, tileDodik.y)
				this:addUpgradeFeature(i, "monkey", box.id, posDodik, box.link)
			end

		end

	end

	function this:addUpgradeFeature(vIndex, vTypeFood, vIdPlaceMain, pos, vLinkName)
		local offsetArrow = dataSklad.getZavodOffsetArrow(vTypeFood, vLinkName)

		
		local indexUpgradeView = this.dataMart:getIndexUpgradeView(vIndex) or 2

		local value_scroll = (indexUpgradeView - 1) * -200 + 100
		
		local upgrade_aim = addGraphic({sprite="aim1", x=pos.x+offsetArrow.x, y=pos.y+offsetArrow.y, z=DEEP_DUST})
		local upgrade_arrow = addGraphic({sprite="aim_upgrade", x=pos.x+offsetArrow.x-3, y=pos.y+offsetArrow.y+2, z=DEEP_DUST})
		
		msg.post(upgrade_aim, "updateScale", {value = 0.8})
		msg.post(upgrade_arrow, "updateScale", {value = 0.8})

		msg.post(upgrade_aim, "hide")
		msg.post(upgrade_arrow, "hide")

		local upgrade_indicator = addIndicator({
			x = pos.x+offsetArrow.x-3,
			y = pos.y+offsetArrow.y+3,
			z = DEEP_CLOUD + 0.05
		})

		local indicatorData = {
			typeInd	= 'upgrade',
			tick	= 1,
			tickMax	= global.timeIndicator,
			tickStep = 1,
			isAdded	= true,
			isReady	= false,
			isNear	= false,
			view	= upgrade_indicator,
			pos		= vmath.vector3(pos.x+offsetArrow.x, pos.y+offsetArrow.y, 0),
			callIndicatorEvent = this.openUpgradePopup,
			scrollValue	= value_scroll
		}

		table.insert(this.listIndicators, indicatorData)
		msg.post(upgrade_indicator, "setIncicatorLink", { value = #this.listIndicators })

		this.listPlaceBoxes[vIdPlaceMain].upgrade_aim = upgrade_aim
		this.listPlaceBoxes[vIdPlaceMain].upgrade_arrow = upgrade_arrow
		this.listPlaceBoxes[vIdPlaceMain].upgrade_indicator = upgrade_indicator
		this.listPlaceBoxes[vIdPlaceMain].indicatorData = indicatorData

	end

	function this:updateUpgradeBox(vNumPlaceBox, vIsShow)
		local placeBox			= this.listPlaceBoxes[vNumPlaceBox]
		local upgrade_arrow		= placeBox.upgrade_arrow
		local upgrade_aim		= placeBox.upgrade_aim
		local upgrade_indicator	= placeBox.upgrade_indicator
		local indicatorData		= placeBox.indicatorData
		
		if vIsShow then
			if (indicatorData.tick < 0) then
				indicatorData.tick = indicatorData.tick + 1
				return
			end

			msg.post(upgrade_aim, "show")
			msg.post(upgrade_arrow, "show")
			indicatorData.isReady = true
		else
			msg.post(upgrade_aim, "hide")
			msg.post(upgrade_arrow, "hide")
			msg.post(upgrade_indicator, "setVisible", { value = false} )
			
			indicatorData.tick = 1
			indicatorData.isReady = false
		end

	end

	function this:openUpgradePopup(vScrollValue)
		msg.post(url_screen_gui_game, "showPopupUpgrade", {scrollValue = vScrollValue})

	end

	

	function this:addBoostEffects(vPos, vOffsetY)
		local pos = vmath.vector3(vPos.x, vPos.y, 0)
		local posZ = this:getPosZ(pos.y - vOffsetY)

		local newEffect = addFactorySpine({factoryName='#factoryEffectSpine',x=pos.x, y=pos.y, z=posZ})
		local object = newEffect.root

		msg.post(object, "setScale", {value = 2.0})
		msg.post(object, "playAnim", {name = "effect_aura2", loop = true} )
		msg.post(object, "updateVisible", { value = false} )

		return object
	end

	function this:updateStamina(vIdZavod)
		local place = this.listPlaceBoxes[vIdZavod]

		if not this.isBoostZavods then
			place.stamina = place.stamina - 1
		end

		if (place.stamina <= 0) and (place.linkSklad) then
			timer.delay(0.5, false, function()
				this:setZavodSleep(place.objectBoost, true)
			end)

		end

	end

	function this:zavodWakeUp(vObject)
		local type = vObject.type

		if type == 'animal' then
			addEffect("top", "effect_alarm", vmath.vector3(vObject.pos.x + 35, vObject.pos.y + 100, DEEP_CLOUD))
			playSound("sfx_alarm")

		elseif type == 'machine' then
			addEffect("top", "effect_repair", vmath.vector3(vObject.pos.x + 45, vObject.pos.y + 1, DEEP_CLOUD))
			playSound("sfx_repair")

			quest_manager.checkQuest('fix_appliance')
		end

		vObject.isSleeping = false

		this:finishMainAction('zavod')

		timer.delay(0.5, false, function()
			this:setZavodSleep(vObject, false)
		end)

	end

	function this:setZavodSleep(vObject, vBool)
		local object	= vObject
		local vType		= object.name
		local placeId	= object.placeId

		if (vBool) then
			msg.post(object.cloud.root, "show")

			gameState:showHint(true, 1, 'arrow', object.pos, 230)

			if vType == 'cow' or vType == 'cow2' then
				msg.post(object.view, "playAnim", { name = "sleep_cow1", loop = true} )
			elseif vType == 'chicken' then
				msg.post(object.view, "playAnim", { name = "sleep_chicken1", loop = true} )
			elseif vType == 'pig' then
				msg.post(object.view, "playAnim", { name = "sleep_pig1", loop = true} )
			end
		else
			msg.post(object.cloud.root, "hide")

			this.listPlaceBoxes[placeId].stamina = this.listPlaceBoxes[placeId].stamina_max

			gameState:showHint(false, 1, 'arrow')

			if vType == 'cow' or vType == 'cow2' then
				msg.post(object.view, "playAnim", { name = "sleep_cow2", loop = false} )
			elseif vType == 'chicken' then
				msg.post(object.view, "playAnim", { name = "sleep_chicken2", loop = false} )
			elseif vType == 'pig' then
				msg.post(object.view, "playAnim", { name = "sleep_pig2", loop = false} )
			end
		end

		object.isSleeping = vBool

		this:updateAlert(vBool, {t = vType, id = placeId})

	end

	

	function this:addMonkeys()
		local posCustomers = this.posStart

		this.ourPlayer = this:addPlayer('idMy', this.posDodik.x, this.posDodik.y,
			{
				skin	= 'monkey1',
				role	= ROLE_WORKER,
				is_bot	= false
			})

		this.dodikAssist1 = this:addPlayer('id_a1', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_CASHIER,
				is_bot	= true
			})

		this.dodikAssist2 = this:addPlayer('id_a2', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikAssist3 = this:addPlayer('id_a3', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikAssist4 = this:addPlayer('id_a4', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikAssist5 = this:addPlayer('id_a5', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikAssist6 = this:addPlayer('id_a6', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikAssist7 = this:addPlayer('id_a7', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_STOCKMAN,
				is_bot	= true
			})

		this.dodikHooligan = this:addPlayer('id_h1', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey7',
				role	= ROLE_ROWDY,
				is_bot	= true
			})

		this.dodikManager = this:addPlayer('id_m1', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey9',
				role	= ROLE_MANAGER,
				is_bot	= true
			})

		this.dodikDeliveryBoy = this:addPlayer('id_db1', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey18',
				role	= ROLE_DELIVERYBOY,
				is_bot	= true
			})

		this.ourPlayer:updateHat(global.selectedHat)
		this.ourPlayer:setOptions({maxFood = 3})

		posCustomers = this:getExitPoint(5)

		this.dodikCustomer1 = this:addPlayer('id1', posCustomers.x+5, posCustomers.y,
			{
				skin	= 'monkey2',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer2 = this:addPlayer('id2', posCustomers.x+10, posCustomers.y,
			{
				skin	= 'monkey3',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer3 = this:addPlayer('id3', posCustomers.x+15, posCustomers.y,
			{
				skin	= 'monkey4',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer4 = this:addPlayer('id4', posCustomers.x+20, posCustomers.y,
			{
				skin	= 'monkey5',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer5 = this:addPlayer('id5', posCustomers.x+25, posCustomers.y,
			{
				skin	= 'monkey6',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer6 = this:addPlayer('id6', posCustomers.x+30, posCustomers.y,
			{
				skin	= 'monkey7',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer7 = this:addPlayer('id7', posCustomers.x+35, posCustomers.y,
			{
				skin	= 'monkey7',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikCustomer8 = this:addPlayer('id8', posCustomers.x+40, posCustomers.y,
			{
				skin	= 'monkey7',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikPunch = this:addPlayer('id_punch', posCustomers.x, posCustomers.y,
			{
				skin	= 'monkey4',
				role	= ROLE_BUYER,
				is_bot	= true
			})

		this.dodikAssist1:updateVisible(false)
		this.dodikAssist2:updateVisible(false)
		this.dodikAssist3:updateVisible(false)
		this.dodikAssist4:updateVisible(false)
		this.dodikAssist5:updateVisible(false)
		this.dodikAssist6:updateVisible(false)
		this.dodikAssist7:updateVisible(false)
		this.dodikManager:updateVisible(false)
		this.dodikDeliveryBoy:updateVisible(false)
		this.dodikCustomer1:updateVisible(false)
		this.dodikCustomer2:updateVisible(false)
		this.dodikCustomer3:updateVisible(false)
		this.dodikCustomer4:updateVisible(false)
		this.dodikCustomer5:updateVisible(false)
		this.dodikCustomer6:updateVisible(false)
		this.dodikCustomer7:updateVisible(false)
		this.dodikCustomer8:updateVisible(false)
		this.dodikPunch:updateVisible(false)
		this.dodikHooligan:updateVisible(false)

		this.toyPunchForMonkeyPunch = this:addToyPunch(0, 0)
		msg.post(this.toyPunchForMonkeyPunch, "hide")
		
	end

	

	function this:initTimers()
		if not global.isShowDebug then
		timer.delay(0.5, true, function()
			this:updateAllZavods()
		end)

		timer.delay(1.0, true, function()
			this:updateBots()
			this:updateQueueCashbox()
			this:checkAnimalAudio()
			this:checkEvents()
			this:tickBoosts()
			this:checkParrot()
			this:checkAllPlaces('player', this.ourPlayer.pos)
			this:checkDailyOffer()
			this:tickDetectWarehouses()
			this:tickDeliveryTimeOrder()
			this:checkAvailableUpgrade()
		end)
		end

	end

	

	function this:checkDailyOffer()
		if global.isPopupIapOpened then
			msg.post(url_popup_iap, "update_offer_daily")
		end
		if global.isPopupQuestsOpened then
			msg.post(url_popup_daily_quest, "update_remaining_time")
		end

		this:checkAvailableGems()
		this:checkAvailableQuest()

	end

	function this:checkEvents()
		this.tickLive = this.tickLive + 1

		if (this.tickLive > TIME_MANAGER_WORK) then
			this:sendLiveTick()
			this.tickLive = 0
		end

		this.tickSec = this.tickSec + 1

		if (this.tickSec >= 60) then
			apimanager.check_network(true)
			apimanager.update_playtime()
			this.tickSec = 0
		end

		if this.isTutorial then
			return
		end

		if (not this.dodikHooligan.isAlive) then
			this.tickCrazy = this.tickCrazy + 1
		end

		if (not this.isShowingOffer) then
			this.tickNewOffer = this.tickNewOffer + 1
		end

		if (this.dataMart.NUM_SALE_CRAZY > 1) then
			if (this.tickCrazy > TIME_SHOW_CRAZY) and (this.numSale >= this.dataMart.NUM_SALE_CRAZY) then
				this:addHooligan(this.dodikHooligan)
				this.tickCrazy = 0
			end
		end

		if (this.tickNewOffer > TIME_SHOW_OFFER) and (this.numSale >= this.dataMart.NUM_SALE_OFFER) and (not global.isPopupOpened) and (not global.isConfirmOpened) then
			this:timeForOffer()
			this.tickNewOffer = 0
		end

		this.tickFunSquad = this.tickFunSquad + 1

		if (this.dataMart.NUM_SALE_CRAZY > 1) then
			if (this.tickFunSquad > TIME_FUN_SQUAD) and (this.numSale >= this.dataMart.NUM_SALE_CRAZY) then
				this:addFunSquad()
				this.tickFunSquad = 0
			end
		end

		if (this.dataMart.NUM_SALE_PARROT > 1) then
			if (this.parrot) and (not this.parrot.isAlive) then
				this.tickParrot = this.tickParrot + 1
			end

			if (this.tickParrot > TIME_PARROT) and (this.numSale >= this.dataMart.NUM_SALE_PARROT) then
				if this.parrot then
					this.parrot:fly(true)
				end

				this.tickParrot = 0
			end
		end

		if (this.dataMart.NUM_SALE_SKLAD_2 > 1) then
			if not this.dataDeliveryBoy.isAdded then
				this.tickAddDelivery = this.tickAddDelivery + 1
			end

			if (this.tickAddDelivery > this.maxTickDelivery) and (this.numSale >= this.dataMart.NUM_SALE_SKLAD_2) then
				this:addDeliveryBoy()
				this.tickAddDelivery = 0
			end

		end

		if (this.dodikPunch) and (not this.dodikPunch.isAlive) then
			this.tickMonkeyPunch = this.tickMonkeyPunch + 1

			if (this.tickMonkeyPunch > TIME_MONKEY_PUNCH) and (this.numSale >= this.dataMart.NUM_SALE_OFFER) then
				this:addBuyerPunch(this.dodikPunch)
				this.tickMonkeyPunch = 0
			end

		end

		if (this.indicatorSpeedBoots) then
			if (not this.indicatorSpeedBoots.isReady) and (global.tickBoostBoots == 0) then
				this.tickAddBonus1 = this.tickAddBonus1 + 1

				if (this.tickAddBonus1 > TIME_ADD_BONUS_1) then
					this:addBonus('SpeedBoots')
					this.tickAddBonus1 = 0
				end
			end
		end

		if (this.indicatorPig) then
			if (not this.indicatorPig.isReady) then
				this.tickAddBonus2 = this.tickAddBonus2 + 1

				if (this.tickAddBonus2 > TIME_ADD_BONUS_2) then
					this:addBonus('GoldenPig')
					this.tickAddBonus2 = 0
				end
			end
		end

		if global.isDebug then
			this.count_seconds = this.count_seconds + 1

			if (this.count_seconds % 60 == 0) then
				local list_text = {translate("SHORT_HOURS"),translate("SHORT_MINUTES"),translate("SHORT_SECONDS")}
				local str_time = utils.secToHMS(this.count_seconds, false, list_text)

				
			end
		end

	end

	function this:checkAvailableUpgrade()
		if this.isTutorial or global.isPopupOpened or global.isConfirmOpened then
			return
		end
		
		local upgrades_level = this.dataMart:getUpgradesData('upgrades_level')
		local upgrades_price = this.dataMart:getUpgradesData('upgrades_price')
		local upgrades_max = this.dataMart:getUpgradesData('upgrades_max')

		if (upgrades_level == nil) then
			lume.trace('[ WARNING ] upgrades_level is NIL')
			return
		end

		local coins_value = coinmanager.get_balance()
		local isAvailable = false
		local price = 0
		local lvl = 1
		local lvl_max = 1

		
		lvl = global.upgrades_level1[1][2]

		if (lvl <= 3) then
			price = global.upgrades_price1[1][2][lvl]

			if (price == "free") or (coins_value >= price) then
				isAvailable = true
			end
		end

		if (global.numMarket > 100) then
			isAvailable = false
		end

		local isActive = false
		local listIds = this.dataMart.listUpgradesId

		
		local amountUpgrades = this.dataMart.countUpgrades
		local box = nil
		local isAvaliableUpgrade = false

		for i=2,amountUpgrades do
			isAvaliableUpgrade = false

			box = gameState.listPlaceBoxes[listIds[i]]
			isActive = box.isActive

			for j=1,3 do
				lvl = upgrades_level[i][j]
				lvl_max = upgrades_max[i][j]

				if isActive then
					if (lvl <= lvl_max) then
						price = upgrades_price[i][j][lvl]

						if coins_value >= price then
							isAvailable = true
							isAvaliableUpgrade = true
							
						end
					end
				end
			end

			if isActive and (box.indicatorData) then
				this:updateUpgradeBox(listIds[i], isAvaliableUpgrade)
			end

			if isAvailable then
				
			end
		end

		
		

		msg.post(url_screen_gui_game, "updateAttention", {type = "upgrade", bool = isAvailable})

	end

	function this:checkAvailableGems()
		if this.isTutorial or (not global.isNetworkConnected) then
			return
		end

		local isAvailable = false
		local date_now = os.date("*t")
		local time_now = os.time(date_now)
		local remaining_seconds_cd = global.cooldown_daily_gems - time_now

		if (remaining_seconds_cd <= 0) and (global.state_daily_gems < 4) then
			isAvailable = true
		end

		
		
		

		msg.post(url_screen_gui_game, "updateAttention", {type = "gems", bool = isAvailable})

	end

	function this:checkAvailableQuest()
		if this.isTutorial then
			return
		end

		local isAvailable = quest_manager.checkAvailableClaim()

		msg.post(url_screen_gui_game, "updateAttention", {type = "quest", bool = isAvailable})

	end

	function this:playAnimalAudio(vType)
		local r = 1

		if (vType == 'cow') then
			r = math.random(2)
			playSound("sfx_cow"..r)
		elseif (vType == 'chicken') then
			r = math.random(2)
			playSound("sfx_chicken"..r)
		elseif (vType == 'pig') then
			r = 1
			playSound("sfx_pig"..r)
		end

	end

	function this:checkAnimalAudio()
		local distance = 0
		local object = nil
		local id_zavod = 0
		local type = 0

		for k,animal in pairs(this.listAnimalObjects) do
			id_zavod = animal.id_zavod
			type = animal.type
			object = this.listZavodObjects[id_zavod]

			if object then
				object.audioTick = object.audioTick + 1

				if (this.listPlaceBoxes[object.placeId].isActive) and (not object.isSleeping) and (object.audioTick > 5) then
					object.audioTick = 0

					distance = lume.distance(this.ourPlayer.pos.x, this.ourPlayer.pos.y, object.pos.x, object.pos.y, true)

					if distance < 35000 then
						this:playAnimalAudio(type)
					end
				end
			end

		end

	end

	function this:initUpgrades()
		this.dataMart:initUpgrades()
		local amountUpgrades = this.dataMart.countUpgrades

		for i=1,amountUpgrades do
			gameState:upgradeObject(i, 1)
			gameState:upgradeObject(i, 2)
			gameState:upgradeObject(i, 3)
		end

	end

	function this:upgradeObject(vNum, vTypeUpgrade)
		local upgrades_level = this.dataMart:getUpgradesData('upgrades_level')
		local list_id_dodiks = this.dataMart:getUpgradesData('list_id_dodiks')
		local list_id_zavods = this.dataMart:getUpgradesData('list_id_zavods')
		local list_id_caravans = this.dataMart:getUpgradesData('list_id_caravans')

		if (vNum == 1) then
			upgrades_level	= global.upgrades_level1
			upgrades_price	= global.upgrades_price1
			upgrades_max	= global.upgrades_max1
		end

		if (upgrades_level == nil) then
			lume.trace('[ WARNING ] upgrades_level is NIL')
			return
		end

		local upgradeLvl = upgrades_level[vNum][vTypeUpgrade]

		

		if (vNum == 1) then														
			if vTypeUpgrade == 2 then
				if upgradeLvl == 2 then
					this.ourPlayer:setOptions({maxFood = 4})
				elseif upgradeLvl == 3 then
					this.ourPlayer:setOptions({maxFood = 5})
				elseif upgradeLvl == 4 then
					this.ourPlayer:setOptions({maxFood = 6})
				end
			end

		elseif (table.indexOf(list_id_dodiks, vNum) > 0) then					
			local player = this.dataMart:getUpgradeDodik(vNum)

			if vTypeUpgrade == 1 then
				if upgradeLvl == 2 then
					player:setOptions({stamina_max = 8})
				elseif upgradeLvl == 3 then
					player:setOptions({stamina_max = 10})
				elseif upgradeLvl == 4 then
					player:setOptions({stamina_max = 12})
				end
			elseif vTypeUpgrade == 2 then
				if upgradeLvl == 2 then
					player:setOptions({maxFood = 4})
				elseif upgradeLvl == 3 then
					player:setOptions({maxFood = 5})
				elseif upgradeLvl == 4 then
					player:setOptions({maxFood = 6})
				end
			elseif vTypeUpgrade == 3 then
				if upgradeLvl == 2 then
					player:setOptions({speed = 5})
				elseif upgradeLvl == 3 then
					player:setOptions({speed = 6})
				elseif upgradeLvl == 4 then
					player:setOptions({speed = 7})
				end
			end

		elseif (table.indexOf(list_id_zavods, vNum) > 0) then
			local zavodInfo = this.dataMart:getUpgradeZavod(vNum)
			local zavod = zavodInfo.zavod
			local zavodSklad = zavodInfo.zavodSklad
			local zavodSklad2 = zavodInfo.zavodSklad2

			if vTypeUpgrade == 1 then					
				if upgradeLvl == 2 then
					this.listPlaceBoxes[zavod].stamina_max = 12
				elseif upgradeLvl == 3 then
					this.listPlaceBoxes[zavod].stamina_max = 20
				elseif upgradeLvl == 4 then
					this.listPlaceBoxes[zavod].stamina_max = 28
				end
			elseif vTypeUpgrade == 2 then				
				if upgradeLvl == 2 then
					this:upgradeSklad(zavodSklad, 6)
					this:upgradeZavod(zavod, 6)

					if (zavodSklad2 > 0) then
						this:upgradeSklad(zavodSklad2, 6)
					end
				elseif upgradeLvl == 3 then
					this:upgradeSklad(zavodSklad, 8)
					this:upgradeZavod(zavod, 8)

					if (zavodSklad2 > 0) then
						this:upgradeSklad(zavodSklad2, 8)
					end
				end
			elseif vTypeUpgrade == 3 then				
				if upgradeLvl == 2 then
					this.listPlaceBoxes[zavod].zavodBuild = 10
				elseif upgradeLvl == 3 then
					this.listPlaceBoxes[zavod].zavodBuild = 8
				elseif upgradeLvl == 4 then
					this.listPlaceBoxes[zavod].zavodBuild = 6
				end
			end

		elseif (table.indexOf(list_id_caravans, vNum) > 0) then
			local caravan = this.dataMart:getUpgradeCaravan(vNum)

			if vTypeUpgrade == 2 then					
				if upgradeLvl == 2 then
					this:upgradeZavod(caravan, 6)
				elseif upgradeLvl == 3 then
					this:upgradeZavod(caravan, 8)
				end
			elseif vTypeUpgrade == 3 then				
				if upgradeLvl == 2 then
					this.listPlaceBoxes[caravan].workReload = 10
				elseif upgradeLvl == 3 then
					this.listPlaceBoxes[caravan].workReload = 8
				elseif upgradeLvl == 4 then
					this.listPlaceBoxes[caravan].workReload = 6
				end
			end

		end

	end

	

	function this:testFunctions()
		local midScreen = this.midScreen

		if global.isShowDebug then
			local image = addGraphic({sprite="debug_point",x=midScreen.x, y=midScreen.y, z=DEEP_BACKGROUND})
			msg.post(image, "updateScale", {value = 2.0})

			local image = addGraphic({sprite="debug_point",x=this.dataMart.posStart.x, y=this.dataMart.posStart.y, z=DEEP_BACKGROUND})
			msg.post(image, "updateScale", {value = 2.0})
			msg.post(image, "updateTint", {color = '#00FF00'})

			local image = addGraphic({sprite="debug_point",x=this.dataMart.posExit.x, y=this.dataMart.posExit.y, z=DEEP_BACKGROUND})
			msg.post(image, "updateScale", {value = 2.0})
			msg.post(image, "updateTint", {color = '#0000FF'})

			
		end

		if global.isShowTiles then
			local posX = midScreen.x-CELL_SIZE*2+CELL_SIZE*0 + CELL_SIZE*7
			local posY = midScreen.y-CELL_SIZE+CELL_SIZE*0 + CELL_SIZE*-5
			local path_grid = addGraphic({layer="top",sprite="path_grid",x=posX, y=posY, z=DEEP_EFFECT})
			msg.post(path_grid, "updateScale", {value = 4.0})

			this:updateDebugEditorGrid()

			if this.dataMart.tilesZavod then
				for k,v in pairs(this.dataMart.tilesZavod) do
					this:showDebugTile(v)
				end
			end

		end

		
		
		

		if global.isUnlockPlaces then
			
			
		end

		

		if global.isTestDrawCall then
			

		end

		
		

		

		this.ourPlayer:setOptions({maxFood = 6})

		
		
		

		
		
		
		
		
		

		


















		

	end

	function this:addTestToyPunch(vBool)
		if vBool then
			if this.isAddedTestToyPunch then
				msg.post(this.toyPunch, "show")
				msg.post(this.toyPunch, "set_follower", { id = this.ourPlayer.id })

			else
				this.toyPunch = this:addToyPunch(0, 0)
				msg.post(this.toyPunch, "set_follower", { id = this.ourPlayer.id })

				this.isAddedTestToyPunch = true
			end
		else
			msg.post(this.toyPunch, "hide")
			msg.post(this.toyPunch, "remove_follower")

		end

		msg.post(this.ourPlayer.view, "setToyPunch", { bool = vBool} )

	end

	function this:testAssitants()
		

		local dodik = nil
		local place = nil
		local placePos = nil

		for i=1,7 do
			place = this.dataMart.PLACES["placebox_aim"..i]

			if place then
				placePos = place.pos
				dodik = this["dodikAssist"..i]
				dodik:setOptions({speed = 9})
				dodik:updatePosition(vmath.vector3(placePos.x - 100, placePos.y, 0))
			end

		end

	end

	function this:fillSklads(vCount)
		local sklad = nil
		local count = vCount

		for _,v in pairs(this.listWarehouses) do
			sklad = this.dataMart.PLACES[v].id
			if this.listPlaceBoxes[sklad].isActive then
				this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].countFood + count
				if this.listPlaceBoxes[sklad].countFood > this.listPlaceBoxes[sklad].maxCount then
					this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].maxCount
				end
				this:updateSklad(this.listPlaceBoxes[sklad].listFood, this.listPlaceBoxes[sklad].countFood, sklad)
			end
		end

	end

	function this:sleepZavods()
		for k,v in pairs(this.listZavodObjects) do
			this:setZavodSleep(v, true)
		end

	end

	function this:fillZavods(vCount)
		local sklad = nil
		local count = vCount

		for _,v in pairs(this.listZavodIn) do
			sklad = this.dataMart.PLACES[v].id
			this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].countFood + count
			if this.listPlaceBoxes[sklad].countFood > this.listPlaceBoxes[sklad].maxCount then
				this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].maxCount
			end
			this:updateSklad(this.listPlaceBoxes[sklad].listFood, this.listPlaceBoxes[sklad].countFood, sklad)
		end

		for _,v in pairs(this.listZavodOut) do
			sklad = this.dataMart.PLACES[v].id
			this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].countFood + count
			if this.listPlaceBoxes[sklad].countFood > this.listPlaceBoxes[sklad].maxCount then
				this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].maxCount
			end
			this.listPlaceBoxes[sklad]:callCollect(this.listPlaceBoxes[sklad].linkFood, this.listPlaceBoxes[sklad].countFood)

			if global.isShowUpgrade then
				lume.trace('===============')
				lume.trace(v)
				lume.trace('===============')
				lume.trace('stamina_max',this.listPlaceBoxes[sklad].stamina_max)
				lume.trace('maxCount',this.listPlaceBoxes[sklad].maxCount)
				lume.trace('zavodBuild',this.listPlaceBoxes[sklad].zavodBuild)
			end
		end

	end

	function this:fillOneZavod(vLinkName)
		local sklad = this.dataMart.PLACES[vLinkName].id
		this.listPlaceBoxes[sklad].countFood = this.listPlaceBoxes[sklad].countFood + 1
		this:updateSklad(this.listPlaceBoxes[sklad].listFood, this.listPlaceBoxes[sklad].countFood, sklad)

	end

	function this:showUpgradeInfo()
		local p = nil
		local isNeedAdd = true

		for k,v in pairs(this.players) do
			p = this.players[k]
			if p.isAlive and p.is_bot and ((p.roleType == ROLE_STOCKMAN) or (p.roleType == ROLE_MANAGER)) then
				lume.trace('===============')
				lume.trace(p.id)
				lume.trace('===============')
				lume.trace('stamina_max',p.stamina_max)
				lume.trace('maxFood',p.maxFood)
				lume.trace('speed',p.speed)
			end
		end
	end

	function this:addWarehouseIcons()
		local box, sklad = nil
		local dataWarehouse = {}

		for _,v in pairs(this.listWarehouses) do
			sklad = this.dataMart.PLACES[v].id
			box = this.listPlaceBoxes[sklad]

			if box.isWarehouse then	
				
				table.insert(dataWarehouse, {
								name = box.nameFood,
								link = box.link,
								offset = vmath.vector3(0,-180,0)
							})

				
				this:updateSkladDecor(box.typeSklad, box.link, box.iconFrame, box.offsetIcon)
			end

		end

		this.dataMart.dataWarehouse = dataWarehouse

	end
	

	function this:addDancers(vCount)
		local countMonkeys = vCount or 3
		local posCustomers = nil
		local p = math.random(1000)

		local pointDancer = {
			vmath.vector3(-115,0,0),
			vmath.vector3(0,70,0),
			vmath.vector3(115,0,0)
		}

		for i=1,countMonkeys do
			posCustomers = this.dataMart:getExitPoint(i-1)

			local numSkin = 1 + math.random(6)

			local buyer = this:addPlayer('id_dancer'..i, posCustomers.x, posCustomers.y,
				{
					skin	= 'monkey'..numSkin,
					role	= ROLE_DANCER,
					is_bot	= true
				})

			buyer.isWaitDance = false
			buyer.dancePoint = pointDancer[i]
			buyer:updateHat(1)
			buyer.brainState = 0
			buyer:setOptions({speed = 7})
			
			msg.post(buyer.view, "set_pompom" )

		end

	end

	function this:checkCelebrating()
		local countReadyDancer = 0
		local listDancers = {}

		local player = nil
		for k,v in pairs(this.players) do
			player = this.players[k]

			if player.isAlive and player.isWaitDance then
				countReadyDancer = countReadyDancer + 1
				table.insert(listDancers, player)
			end
		end

		

		if (countReadyDancer == 4) then
			msg.post(url_popup_message, "play_particles")
			
			for k,v in pairs(listDancers) do
				v:startDance()
			end

			timer.delay(2.6, false, function()
				if (global.numMarket < global.maxMarket) then
					this:followCameraPlace(this.listSalesMain[this.numSale + 1])
				end

				msg.post(url_screen_gui_game, 'enable')

				this.ourPlayer.isCollecting = false
				this.ourPlayer.allowDrop = true

				if (this.temp_listCollectedFood) and (#this.temp_listCollectedFood > 0) then
					for k,v in pairs(this.temp_listCollectedFood) do
						table.insert(this.ourPlayer.listCollectedFood, v)
					end
					
					msg.post(this.ourPlayer.view, "setFood", { list = {}} )

					timer.delay(0.05, false, function()
						msg.post(this.ourPlayer.view, "setFood", { list = this.ourPlayer.listCollectedFood} )
					end)

				end

				this.temp_listCollectedFood = nil

				if (global.numMarket > 100) then
					local numEvent = nil

					if (global.numMarket == 101) then
						numEvent = 1
					elseif (global.numMarket == 102) then
						numEvent = 2
					end

					msg.post(url_screen_gui_game, "show_event_completed", {event = numEvent})
				end

			end)

			global.isCheckCollision = true

			msg.post(url_popup_message, "show_message", {text_id = "MART_COMPLETED"})

			playSound("sfx_happy4")
			playSound("sfx_applause")
			playSound("sfx_pook")

		end

	end

	function this:startCelebrating()
		local player = this.ourPlayer
		this:followPlace(player.id, 'dancefloor')
		player.inputAllowed = false
		player.isFollowPath = true
		player.isDancePlace = true
		player.isWaitDance = false
		player.dancePoint = vmath.vector3(0,-50,0)
		player.isCollecting = true
		player.allowDrop = false

		global.isCheckCollision = false

		this.temp_listCollectedFood = {}
		for k,v in pairs(this.ourPlayer.listCollectedFood) do
			table.insert(this.temp_listCollectedFood, v)
		end

		this.ourPlayer.listCollectedFood = {}
		msg.post(this.ourPlayer.view, "food_clear")

		this:addDancers(vCount)

	end

	function this:getDancefloorPoint(vOffset)
		local p = this.dataMart.posDancefloor or vmath.vector3(0,0,0)
		return (p + vOffset)
	end
	

	function this:checkFromSave()
		local place = nil
		local have_places = this.dataMart.have_places

		if have_places then
			for i, box in pairs(this.listPlaceBoxes) do
				place = have_places[i]

				if place then
					if place[1] then
						box.isActive = true
					else
						box.paid = place[2]
					end
				end
			end
		end

		for k,v in pairs(this.listSalesMain) do
			if k <= this.numSale then
				this.listPlaceBoxes[v].isActive = true
			end
		end

		if global.isUnlockPlaces then
			for i, box in pairs(this.listPlaceBoxes) do
				box.isActive = true
			end
		end

	end

	function this:checkValues()
		lume.trace('[ INFO ] count of placeBoxes', #this.listPlaceBoxes)
		lume.trace('[ INFO ] count of main Sales', #this.listSalesMain)

		
		if (this.amountCashBox % 10) ~= 0 then
			this.amountCashBox = math.ceil(this.amountCashBox / 10) * 10
		end

		this.maxTickDelivery = TIME_DELIVER_BOY_CD1

	end

	

    function this:init()
        this:initSettingsGame()

		this:setDataMart(global.numMarket)
		this.dataMart:updateDataMain()
		this:checkValues()
		this:initPath()
		this:updateCoins()
		this:initHelpCamera()
		this:initFoodAnims()
		this:addMonkeys()

		this.controlId = this.ourPlayer.id
		setCamera("follow", this.players[this.controlId].view)
		setCamera("setBounds", nil, nil, this.limitMoveX.max+100, this.limitMoveY.max)

		if global.isMobileTrue then
			local zoom = camera.get_zoom(CAMERA_ID)
			camera.set_zoom(CAMERA_ID, 0.9)
		end

		this:addSpecObject(this.posTrash)
		this:addSpecObject(this.posBasket)

		this:checkFromSave()

		local temp_mart = addCollectionMart(global.numMarket)

		this:addPlaces()
		this:addBorders()
		this:addWater()

		msg.post(url_popup_upgrades, "init_upgrades")

		this.placeCashBox = this.listPlaceBoxes[this.NUMPLACE_CAHSBOX]

		this:initIndicatorManager()
		this.effectBoostCash = this:addBoostEffects(vmath.vector3(this.placeCashBox.x+20, this.placeCashBox.y+90, 0), 80)

		this:initParrot()
		this:initCrabs()
		this:initDeliveryBoy()
		
		this:initGoldenPig()
		this:initSpeedBoots()

		this.dataMart:fillWarehouses()
		this:fillSklads(0)

		this.dataMart:setupDodiki()
		this.dataMart:updateAlertPlaces()
		this.dataMart:addZavodViews()
		this.dataMart:addDecorBack()
		this.dataMart:addGraphicsPlaces()
		this:addWarehouseIcons()

		for i, box in pairs(this.listPlaceBoxes) do
			this.dataMart:placeCheckBought(box.id, true)

			if (box.isActive) then
				this:checkNextPlaceSale(box.id, true)
			end
		end

		this:checkBoosts()
		this:initArrowHintDirection()
		this:checkTutorial()
		this:checkNextPlaceSale()
		this:updateCashboxView()
		this:initUpgrades()
		this:initTimers()
		this:checkBoostManager()
		this:initUpgradeFeature()

		datamanager.check_daily_bonus(this.isTutorial)

		this.isGameStarted = true
		global.isAdBreak = false

		if global.isDebug then
			this:testFunctions()
		end

    end

	function this:closePopup(vIsSkipAds)
		if this.isTutorial then
			this:gameplayStart()
		else
			if vIsSkipAds then
				return
			end

			if (config.platform == PLATFORM_WEB) then
				apimanager.show_interstitial()

			elseif (config.platform == PLATFORM_ANDROID) or (config.platform == PLATFORM_IOS) then
				if (global.isAdBreak and global.isTimeForAdBreak) then
					apimanager.finish_ad_break()
					msg.post(url_screen_gui_game, "setBreakAdsPanel", {value = false})
				else
					apimanager.start_ad_break(apimanager.MIN_TIME)
				end

			end
		end

	end

	function this:checkFocus()
		if html5 and (not this.isFirstInput) then
			local hasFocus = html5.run("document.hasFocus()")

			local stringtoboolean = { ["true"] = true, ["false"] = false }

			if (stringtoboolean[hasFocus]) then
				this.stepTutorial = -1
				msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})
			end

		end

	end

	function this:checkInput()
		if (not this.isFirstInput) then
			this:gameplayStart()
			this.isFirstInput = true

			if (this.isTutorial) and (this.stepTutorial == -1) then
				this.stepTutorial = 0
				msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})
			end
		end

	end

	function this:gameplayStart()
		if (this.gamePlayStarted) then
			return
		end

		this.gamePlayStarted = true

		

		if html5 then
			if global.isAllowDebug then
				return
			end
			lume.trace('[ POKI_API ] gameplay_start')
			if poki_sdk then
				poki_sdk.gameplay_start()
			end
		end

	end

	function this:gameplayStop()
		if (not this.gamePlayStarted) then
			return
		end

		this.gamePlayStarted = false

		

		if html5 then
			if global.isAllowDebug then
				return
			end
			lume.trace('[ POKI_API ] gameplay_stop')
			if poki_sdk then
				poki_sdk.gameplay_stop()
			end
		end

	end

	function this:onFinishMainAction(vDelay)
		local timer_delay = vDelay or 1.0

		if global.isCommercialBreak or global.isRewardBreak then
			return
		end

		if (config.platform == PLATFORM_WEB) then
			timer.delay(timer_delay, false, function()
				if (not global.isRewardBreak) then
					this:gameplayStop()
				end
				apimanager.show_interstitial()
			end)

		elseif (config.platform == PLATFORM_ANDROID) or (config.platform == PLATFORM_IOS) then
			if (this.isBoughtCow) then
				apimanager.request_review()
				this.isBoughtCow = false
			else
				if (not global.isAdBreak) then
					timer.delay(timer_delay, false, function()
						apimanager.start_ad_break(apimanager.MIN_TIME)
					end)
				end
			end

		end

	end

	function this:finishMainAction(vAction)
		

		if this.isTutorial or ((this.numSale <= 4) and (global.numMarket == 1)) then
			return
		end

		if global.isPopupOpened then
			lume.trace('[ WARNING ] onFinishMainAction skip because isPopupOpened')
			return
		end

		

		if vAction == 'collect_cash' then
			

			
				this:onFinishMainAction()
			

		elseif vAction == 'place' then
			this:onFinishMainAction()

		end

	end

	function this:checkArrowHintDirection()
		if (this.isTutorial or global.isUnlockPlaces) then
			return
		end

		local isHaveTaskPlace = false

		for k,v in pairs(this.listAlert) do
			if (v.t == 'place') then
				isHaveTaskPlace = true
				break
			end
		end

		

		if (global.numMarket == 1) and (this.numSale < 7) then
			isHaveTaskPlace = true
		end

		if (not isHaveTaskPlace) then
			return
		end

		local countMax = #this.dataMart.listSalesMain

		if (global.numMarket == global.maxMarket) then
			countMax = countMax - 1
		end

		if (this.numSale < countMax) then
			local box = nil
			local id_place = 0
			local needToPay = 0

			id_place = this.numSale + 1
			box = this.listPlaceBoxes[this.dataMart.listSalesMain[id_place]]
			needToPay = box.price - box.paid

			local coins_value = coinmanager.get_balance()
			if (coins_value >= needToPay) then
				local numPlace = box.id
				object = this.listPlaceBoxes[numPlace]
				this.arrowDirectionPos = object.pos + object.offsetBuy
			else
				this.arrowDirectionPos = nil
				msg.post(this.arrowHintDirection, "hide")
			end

		end

	end

	function this:setPosArrowHintDirection(vStepTutorial)
		local object = nil
		local numPlace = 0
		this.arrowDirectionPos = nil

		if vStepTutorial == 0 then
			numPlace = 7
			object = this.listPlaceBoxes[numPlace]
			this.arrowDirectionPos = object.pos + object.offsetBuy

		elseif vStepTutorial == 1 then
			numPlace = 5
			object = this.listPlaceBoxes[numPlace]
			this.arrowDirectionPos = object.pos + object.offsetBuy

		elseif vStepTutorial == 2 then
			numPlace = 1
			object = this.listPlaceBoxes[numPlace]
			this.arrowDirectionPos = object.pos + object.offsetBuy

		elseif vStepTutorial == 3 then
			numPlace = 5
			object = this.listPlaceBoxes[numPlace]
			this.arrowDirectionPos = object.pos

		elseif vStepTutorial == 4 then
			numPlace = 7
			object = this.listPlaceBoxes[numPlace]
			this.arrowDirectionPos = object.pos

		end

		if (this.arrowDirectionPos == nil) then
			msg.post(this.arrowHintDirection, "hide")
		end

	end

	function this:updateArrowHintDirection(vPos)
		local posPlayer = vmath.vector3(this.ourPlayer.pos.x, this.ourPlayer.pos.y + 25, 0)
		local posGoal = vmath.vector3(vPos.x,vPos.y,0)
		local posArrow = vmath.vector3(0,0,0)

		local distance = lume.distance(posPlayer.x, posPlayer.y, posGoal.x, posGoal.y, true)

		if (distance < 20000) then
			msg.post(this.arrowHintDirection, "hide")
		else
			msg.post(this.arrowHintDirection, "show")

			local dX = posPlayer.x - posGoal.x
			local dY = posPlayer.y - posGoal.y
			local angle = math.atan2(dY, dX)

			posArrow.x = utils.round(posPlayer.x - 70 * math.cos(angle))
			posArrow.y = utils.round(posPlayer.y - 70 * math.sin(angle))

			msg.post(this.arrowHintDirection, "setPosition", {x = posArrow.x, y = posArrow.y, z = DEEP_DUST})
			msg.post(this.arrowHintDirection, "setAngle", {angle = math.deg(angle)-90})
		end

	end

	function this:initArrowHintDirection()
		this.arrowHintDirection = addGraphic({sprite="tutorial_arrow2", x=0, y=0, z=DEEP_DUST})
		msg.post(this.arrowHintDirection, "hide")

	end

	function this:checkTutorial()
		if (global.numMarket > 1) then
			return
		end

		if (not global.isSkipTutorial) and (not global.isUnlockPlaces) and (this.numSale <= 1) then
			this.isTutorial = true
			this.stepTutorial = 0
			this.tutorial_arrow = addGraphic({layer="top",sprite="tutorial_arrow", x=0, y=0, z=DEEP_CLOUD})

			msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})
			msg.post(url_screen_gui_game, "updateButtons", {bool = false})

			this:updateTutorial()

			timer.delay(1.0, false, this.checkFocus)

		end

	end

	function this:updateTutorial(vData)
		local numPlace = 0
		local offset = vmath.vector3(0,0,0)

		if this.stepTutorial == 0 then
			numPlace = 7
			offset.y = 160
		elseif this.stepTutorial == 1 then
			numPlace = 5
			offset.y = 160
			msg.post(url_screen_gui_game, "updateTutorial", {bool = false})
		elseif this.stepTutorial == 2 then
			numPlace = 1
			offset.y = 160
		elseif this.stepTutorial == 3 then
			numPlace = 5
			offset.x = 20
			offset.y = 80
		elseif this.stepTutorial == 4 then
			numPlace = 7
			offset.x = -210
			offset.y = 130
			msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})
		elseif this.stepTutorial == 5 then
			msg.post(this.tutorial_arrow,"remove")
			msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})
			msg.post(url_screen_gui_game, "updateAttention", {type = "upgrade", bool = true})

		elseif this.stepTutorial == 6 then
			local pos = vData
			pos.x = pos.x + 200
			pos.y = pos.y + 90
			msg.post(url_popup_message, "updateArm", {bool = true, pos = pos, pos2 = vData})

		elseif this.stepTutorial == 7 then
			local pos = vData
			pos.x = pos.x + 20
			pos.y = pos.y - 35
			msg.post(url_popup_message, "updateArm", {bool = true, pos = pos, pos2 = vData})
			msg.post(url_screen_gui_game, "updateAttention", {type = "upgrade", bool = false})

		elseif this.stepTutorial == 8 then
			msg.post(url_screen_gui_game, "updateTutorial", {bool = true, step = this.stepTutorial})

		elseif this.stepTutorial == 9 then
			local pos = vData
			pos.x = pos.x + 30
			pos.y = pos.y + 50
			msg.post(url_popup_message, "updateArm", {bool = true, pos = pos, pos2 = vData})

		elseif this.stepTutorial == 10 then
			local pos = vData
			pos.x = pos.x + 20
			pos.y = pos.y - 35
			msg.post(url_popup_message, "updateArm", {bool = true, pos = pos, pos2 = vData})

		elseif this.stepTutorial == 11 then
			msg.post(url_screen_gui_game, "updateButtons", {bool = true})
			msg.post(url_screen_gui_game, "updateTutorial", {bool = false})
			msg.post(url_popup_message, "updateArm", {bool = false})
			this.isTutorial = false

			msg.post(url_popup_message, "show_message", {text_id = "TUTORIAL_COMPLETED"})

			datamanager.update_saves()

		end

		if this.isTutorial and (numPlace > 0) then
			local box = this.listPlaceBoxes[numPlace]
			local point = vmath.vector3(box.x + box.offsetBuy.x, box.y + box.offsetBuy.y, DEEP_CLOUD)
			msg.post(this.tutorial_arrow,"setPosition",{x = point.x + offset.x, y = point.y + offset.y, z = point.z})
			msg.post(this.tutorial_arrow,"setWaveEffect", {offset = 10, duration = 0.5})
		end

		this:setPosArrowHintDirection(this.stepTutorial)

	end

	function this:updateBots()
		local p = nil
		local isNeedAdd = true

		for k,v in pairs(this.players) do
			p = this.players[k]
			if p.is_bot then
				if p.isAlive then
					p:updateBot()
				else
					if (p.roleType == ROLE_BUYER) and (p.isReadyBuy) and isNeedAdd then
						this:addNewBuyer(p)
						isNeedAdd = false
					end
				end
			end
		end

	end

	function this:updateAllZavods()
		for i, box in pairs(this.listPlaceBoxes) do
			if (box.isActive) and (box.isZavod) and (box.countFood < box.maxCount) and (box.stamina > 0) then
				if box.linkSklad then
					if box.isMultiple then
						local placeSklad1 = this.listPlaceBoxes[box.linkSklad]
						local placeSklad2 = this.listPlaceBoxes[box.linkSklad2]

						if placeSklad1 and placeSklad2 then
							if (placeSklad1.countFood > 0) and (placeSklad2.countFood > 0) then
								box.zavodTick = box.zavodTick + 1
							end
						end
					else
						local placeSklad = this.listPlaceBoxes[box.linkSklad]

						if placeSklad and (placeSklad.countFood > 0) then
							box.zavodTick = box.zavodTick + 1
						end
					end
				else
					box.zavodTick = box.zavodTick + 1
				end

				if (box.zavodTick >= box.zavodBuild) then
					this:updateZavod(box)
					box.zavodTick = 0
				else
					this:updateZavodAnim(box)
				end

				if (box.linkSklad) then
					local object = box.objectBoost

					if object then
						if object.panel then
							msg.post(object.panel.root, "updateTick", {tick = box.zavodTick, build = box.zavodBuild})
						end
						if object.panel2 then
							msg.post(object.panel2.root, "updateTick", {tick = box.zavodTick, build = box.zavodBuild})
						end
					end
				end

			end
			if (box.isActive) and (box.isCaravan) then
				this:updateCaravan(box.id)
			end
		end

	end

	
	function this:checkAlertPlaces()
		local placeName = nil
		local alertValue = nil
		local index = 1

		if (#this.listAlert > 0) then
			local tasks = {}

			for k,v in pairs(this.listAlert) do
				if (v.t ~= 'place') then
					table.insert(tasks, v)
				end
			end

			if (#tasks > 0) then
				alertValue = tasks[index].t

				if alertValue then
					if this.dataMart.placesAlert[alertValue] then
						placeName = this.dataMart.placesAlert[alertValue]
					else
						placeName = 'hooligan'
					end
				end
			end
		end

		return placeName
	end

	function this:getSkladInfo(vId, vMaxFood)
		 local place = this.listPlaceBoxes[vId]
		 local countFood = place.countFood

		 local needCollect = place.maxCount - place.countFood

		 if needCollect > vMaxFood then
			 needCollect = vMaxFood
		end

		if (this.dataMart:checkEmptySklad(vId)) then
			needCollect = 0
		end

		return needCollect
	end

	

	function this:getSkladCount(vId)
		local place = this.listPlaceBoxes[vId]
		local countFood = place.countFood

		return countFood
	end

	function this:throwFromPlace(vNumPlaceBox)
		local placeBox = nil
		local foodType = 1
		local posX = 0
		local posY = 0

		placeBox = this.listPlaceBoxes[vNumPlaceBox]

		if placeBox and placeBox.countFood > 0 then
			foodType = placeBox.typeFood
			placeBox.countFood = placeBox.countFood - 1
			this:updateSklad(placeBox.listFood, placeBox.countFood, placeBox.id)

			posX = lume.random(-10, 10)*15
			posY = placeBox.y - 160 - lume.random(0, 6)*10

			local pStart = vmath.vector3(placeBox.x, placeBox.y, 0)

			local posFood = placeBox.listFood[placeBox.countFood + 1].pos

			local posZ = this:getPosZ(posY)

			pStart = vmath.vector3(posFood.x, posFood.y, posZ)

			local pFinish = vmath.vector3(placeBox.x + posX, posY, posZ)

			this:showFoodAnim2("food"..foodType, pStart, pFinish)

			timer.delay(0.47, false, function()
				this:addDroppedObject(foodType, vmath.vector3(pFinish.x, pFinish.y, 0))
			end)
		end

	end

	function this:throwDroppedObject(vType, vX, vY)
		local posX = 0
		local posY = 0

		if (vType == 0) then
			posX = lume.random(-5, 5)*10
			posY = vY - 50 - lume.random(0, 8)*5

			local posZ = this:getPosZ(posY)
			local pStart = vmath.vector3(vX, vY, posZ)
			local pFinish = vmath.vector3(vX + posX, posY, posZ)

			this:showFoodAnim2(coinmanager.get_icon_name(), pStart, pFinish)

			timer.delay(0.45, false, function()
				this:addDroppedObject(0, vmath.vector3(pFinish.x, pFinish.y, 0))
			end)
		end

	end

	

	function this:getDataGoalPlace(vPlaceId)
		local data = this.dataMart:getDataPlace(vPlaceId)

		if (data.type == nil) then
			lume.trace('[ WARNING ]', 'getDataPlace -> data.type missing!')
		end
		if (data.offsetY == nil) then
			lume.trace('[ WARNING ]', 'getDataPlace -> data.offsetY missing!')
		end
		if (data.places_id == nil) then
			lume.trace('[ WARNING ]', 'getDataPlace -> data.places_id missing!')
		end
		if (data.skladName == nil) then
			lume.trace('[ WARNING ]', 'getDataPlace -> data.skladName missing!')
		end
		if (data.zavodName == nil) then
			lume.trace('[ WARNING ]', 'getDataPlace -> data.zavodName missing!')
		end

		return {
			type = data.type,
			offsetX = data.offsetX or 0,
			offsetY = data.offsetY,
			places_id = data.places_id,
			skladName = data.skladName,
			zavodName = data.zavodName
		}
	end

	function this:followPlace(vId, vNamePlace)
		local tile, num, isSkladPlace, isExitPlace = this.dataMart:getTilePlace(vNamePlace)

		this:followTile(this.players[vId], tile.x, tile.y)

		this.players[vId].isSkladPlace = isSkladPlace
		this.players[vId].isExitPlace = isExitPlace

		if num > 0 then
			this.players[vId].numPlaceBox = num
		end

	end

	

	function this:getExitPoint(vValue)
		return this.dataMart:getExitPoint(vValue)
	end

	function this:placeShowNextMart(vIsFinalPlace, vPointOffset)
		local boxNextMart = this.dataMart.listPlaceBoxes[this.NUMPLACE_NEXTMART]

		this.dataMart.posNextMarket.x = boxNextMart.x + vPointOffset.x
		this.dataMart.posNextMarket.y = boxNextMart.y + vPointOffset.y + 50

		if (not vIsFinalPlace) then
			if (global.maxMarket > global.numMarket) then
				return
			end

			boxNextMart.isActive = true
			boxNextMart.offsetBuy.x = 0
			boxNextMart.offsetBuy.y = -50
		end

		this.isAllowNextMart = true

		this:addDecorObject('aim1', this.dataMart.posNextMarket, -50)

	end

	function this:updateSkladDecor(vTypeSklad, vNamePlaceBox, vIconFrame, vOffsetIcon)
		local data = dataSklad.getSkladDecor(vTypeSklad)
		local num = this.dataMart.PLACES[vNamePlaceBox].id
		local box = this.listPlaceBoxes[num]
		local iconSklad = nil
		local offset = vmath.vector3(0,0,0)

		if vOffsetIcon then
			offset.x = vOffsetIcon.x
			offset.y = vOffsetIcon.y
		end

		local posX = box.x + data.posIcon.x + offset.x
		local posY = box.y + data.posIcon.y + offset.y
		local posIcon = vmath.vector3(posX, posY, 0)

		if vIconFrame then
			iconSklad = this:addDecorObject(vIconFrame, posIcon, data.offsetIcon)
			msg.post(iconSklad, "hide")
			box.iconSklad = iconSklad
		end

		local carpetPlace = addGraphic({
			sprite = data.carpetSprite,
			x = box.x + data.posCarpet.x,
			y = box.y + data.posCarpet.y,
			z = DEEP_BACKGROUND
		})

		if (data.scaleCarpet ~= 1) then
			msg.post(carpetPlace, "updateScale", {value = data.scaleCarpet})
		end

		if (data.posCarpet2) then
			local carpetPlace2 = addGraphic({
				sprite = data.carpetSprite,
				x = box.x + data.posCarpet2.x,
				y = box.y + data.posCarpet2.y,
				z = DEEP_BACKGROUND
			})
			msg.post(carpetPlace2, "hide")
			box.carpet2 = carpetPlace2
		end

		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

	end

	function this:updateZavodDecor(vTypeZavod, vNamePlaceBox, vNamePlaceBoxResult, vIconFrame, vOffsetIcon, vOffsetDop)
		local data = dataSklad.getZavodDecor(vTypeZavod)
		local num = this.dataMart.PLACES[vNamePlaceBox].id
		local box = this.listPlaceBoxes[num]

		if vOffsetDop then
			data.offsetIcon = vOffsetDop
		end

		local posX = box.x + data.posIcon.x + vOffsetIcon.x
		local posY = box.y + data.posIcon.y + vOffsetIcon.y
		local posIcon = vmath.vector3(posX, posY, 0)
		local machineZavod = gameState:addDecorObject(vIconFrame, posIcon, data.offsetIcon)

		local carpetPlace = addGraphic({
			sprite = data.carpetSprite,
			x = box.x + data.posCarpet.x,
			y = box.y + data.posCarpet.y,
			z = DEEP_BACKGROUND
		})

		msg.post(carpetPlace, "hide")
		msg.post(machineZavod, "hide")
		box.carpet = carpetPlace

		num = this.dataMart.PLACES[vNamePlaceBoxResult].id
		this.listPlaceBoxes[num].tree = machineZavod

	end

	function this:addDecorBackground()
		local offsets = {}
		offsets[hash("vase1")] = 50
		offsets[hash("vase2")] = 50
		offsets[hash("wall1")] = 50
		offsets[hash("wall2")] = 100
		offsets[hash("column1")] = 70
		offsets[hash("column2")] = 40
		offsets[hash("palm_column1")] = 140
		offsets[hash("brench1")] = 15
		offsets[hash("brench2")] = 45
		offsets[hash("brench3")] = 30
		offsets[hash("fence1")] = 30
		offsets[hash("fence2")] = 30
		offsets[hash("fence3")] = 30

		offsets[hash("haycart1")] = 30
		offsets[hash("bucket1")] = 30
		offsets[hash("hayfork1")] = 50
		offsets[hash("sink1")] = 15
		offsets[hash("hay_mountain1")] = 20
		offsets[hash("hay_mountain2")] = 30

		offsets[hash("water_wave1")] = 0
		offsets[hash("water_wave2")] = 0
		offsets[hash("water_wave3")] = 0
		offsets[hash("umbrella1")] = 80
		offsets[hash("boyes1")] = 200
		offsets[hash("boyes2")] = 200
		offsets[hash("boyes3")] = 200

		offsets[hash("tree_cemetery1")] = 120
		offsets[hash("tree_cemetery2")] = 120
		offsets[hash("tree_cemetery3")] = 90
		offsets[hash("column_cemetery1")] = 60
		offsets[hash("column_cemetery2")] = 80
		offsets[hash("column_cemetery3")] = 60
		offsets[hash("column_cemetery4")] = 30

		offsets[hash("candle1")] = 20
		offsets[hash("candle2")] = 35
		offsets[hash("candle3")] = 15
		offsets[hash("web1")] = 40

		offsets[hash("fence_cemetery1")] = 30
		offsets[hash("fence_cemetery2")] = 30
		offsets[hash("fence_cemetery3")] = 30
		offsets[hash("wall_cemetery1")] = 50
		offsets[hash("wall_cemetery2")] = 100

		offsets[hash("candy_cane1")] = 20
		offsets[hash("candy_cane2")] = 40
		offsets[hash("snowman1")] = 40
		offsets[hash("column_snowy1")] = 60
		offsets[hash("wall_snowy1")] = 40
		offsets[hash("wall_snowy2")] = 40
		offsets[hash("wall_snowy3")] = 30
		offsets[hash("wall_snowy4")] = 30
		offsets[hash("fir1")] = 90
		offsets[hash("fir2")] = 90
		offsets[hash("fir3")] = 90
		offsets[hash("present1")] = 15
		offsets[hash("present2")] = 15
		offsets[hash("present3")] = 15
		offsets[hash("present4")] = 15
		offsets[hash("present5")] = 15
		offsets[hash("present6")] = 15
		offsets[hash("present7")] = 15
		offsets[hash("present8")] = 15

		offsets[hash("sun_lounger1")] = 30
		offsets[hash("sun_lounger2")] = 30
		offsets[hash("lifebuoy1")] = 15
		offsets[hash("swimming_ball1")] = 15

		local pos = vmath.vector3()
		local offY = 0
		local hash_frame = nil
		local d = nil

		local isHaveSwimAnim = false
		local offsetAdditional = {}

		if (global.numMarket == 3) then
		    offsetAdditional[25] = 55
		    offsetAdditional[36] = 90
		elseif (global.numMarket == 4) then
		    offsetAdditional[5] = 100
		    offsetAdditional[11] = 100
		elseif (global.numMarket == 5) then
			offsetAdditional[30] = 90
		elseif (global.numMarket == 6) then
			isHaveSwimAnim = true
		elseif (global.numMarket == 101) then
		    offsetAdditional[20] = 30
		    offsetAdditional[39] = 100
		    offsetAdditional[40] = 30
		    offsetAdditional[57] = 30
		elseif (global.numMarket == 102) then
			offsetAdditional[5] = 120
			offsetAdditional[12] = 80
		end

		for k,v in pairs(global.decors) do
			pos = v.pos
			hash_frame = v.hash_frame
			offY = offsets[hash_frame]

			if offY then
				if v.scale ~= 1 then
					offY = offY * v.scale
				end
				if offsetAdditional[k] then
					offY = offsetAdditional[k]
				end

				pos.y = pos.y - offY
				d = this:addDecorObject(hash_frame, pos, offY, v.isFlip, v.angle)

				if v.scale ~= 1 then
					msg.post(d, "setScale", {value = v.scale})
				end

				if (isHaveSwimAnim) then
					if (hash_frame == hash("lifebuoy1")) then
						msg.post(d, "setSwimEffect", {value = vmath.vector3(0,10,0), time = 4.0})
					end
					if (hash_frame == hash("swimming_ball1")) then
						msg.post(d, "setSwimEffect", {value = vmath.vector3(0,8,0), time = 3.0})
					end
				end
			else
				lume.trace('[ WARNING ]', hash_frame, 'offset missing!')
			end
		end

		global.decors = {}

	end

	

	function this:getPlaceOffset(vNumPlaceBox, vIsBuyer)
		local r = math.random(1,6)
		local pos = vmath.vector3()
		local box = this.listPlaceBoxes[vNumPlaceBox]

		for i=1,20 do
			if (box.places[i]) and (not box.places[i].isBusy) then
				r = i
				break
			end
		end

		if (#box.places > 0) then
			pos.x = box.x + box.places[r].x
			pos.y = box.y + box.places[r].y

			if vIsBuyer then
				box.places[r].isBusy = true
			end
		else
			pos.x = box.x
			pos.y = box.y - 30

			lume.trace('[ WARNING ]', box.link, 'missing box.places!')
		end

		return {
			pos = pos,
			r = r
		}
	end

	function this:clearOffsetPlace(vNumPlaceBox, vNumPlaceOffset)
		
		if (#this.listPlaceBoxes[vNumPlaceBox].places > 0) then
			this.listPlaceBoxes[vNumPlaceBox].places[vNumPlaceOffset].isBusy = false
		end

	end

	function this:getPlaceOffsetHooligan(vNumPlaceBox)
		local r = 0
		local pos = vmath.vector3()
		local box = nil

		box = this.listPlaceBoxes[vNumPlaceBox]

		r = lume.randomchoice({2,3,5,6})
		pos.x = box.x + box.places[r].x
		pos.y = box.y + box.places[r].y - 15

		return {
			pos = pos,
			r = r
		}
	end

	function this:checkAllPlaces(vTypeObject, vPos, vId)
		local distance = 0
		local posObject = vmath.vector3(vPos.x, vPos.y, 0)
		local isSkip = false

		for i, box in pairs(this.listPlaceBoxes) do
			if box.isActive and box.isPhysics then
				isSkip = false
				
				if (box.link == "placebox_nextmart") and (global.numMarket == global.maxMarket) then
					isSkip = true
				end
				if (box.link == "placebox_caravan") then
					isSkip = true
				end

				if (not isSkip) then
					dist = lume.distance(posObject.x, posObject.y, box.x, box.y, true)

					if (dist < 90000) then
						local value, p = this:checkInsidePlace(vTypeObject, vPos, box.id, vId)

						if value then
							return true, p
						end
					end
				end
			end

		end

		return nil, nil

	end

	function this:checkInsidePlace(vTypeObject, vPos, vPlaceId, vId)
		local place = this.listPlaceBoxes[vPlaceId]
		local newPoint = vmath.vector3()
		local isDetected = false

		if place then
			local points = place.listPoints

			if (vTypeObject == 'bonus') then
				points = place.listHitBox
			end

			if (utils.pointInPolygon(vPos, {points.a,points.b,points.c,points.d})) then
				local nearPoint, pointName = utils.nearPointPolygon4V(vPos, points)			

				local dX = place.x - nearPoint.x
				local dY = place.y - nearPoint.y
				local angle = math.atan2(dY, dX)

				if (vTypeObject == 'player') then
					isDetected = true
					newPoint.x = utils.round(nearPoint.x - 30 * math.cos(angle))
					newPoint.y = utils.round(nearPoint.y - 30 * math.sin(angle))

					this.ourPlayer:updatePosition({x = newPoint.x, y = newPoint.y})
					apimanager.sendAnalytics('ERROR:PLACE', global.numMarket..'_'..place.id)

				elseif (vTypeObject == 'crab') then
					isDetected = true
					newPoint.x = utils.round(nearPoint.x - 60 * math.cos(angle))
					newPoint.y = utils.round(nearPoint.y - 60 * math.sin(angle))

					this.listCrabs[vId]:updatePosition({x = newPoint.x, y = newPoint.y})

				elseif (vTypeObject == 'bonus') then
					isDetected = true
					newPoint.x = utils.round(nearPoint.x - 60 * math.cos(angle))
					newPoint.y = utils.round(nearPoint.y - 60 * math.sin(angle))
					
				end
			end

		end

		return isDetected, newPoint

	end

	
	function this:addTestBuyers(vCount)
		local countMonkeys = vCount or 6
		local posCustomers = nil
		local p = math.random(1000)

		for i=1,countMonkeys do
			posCustomers = this.dataMart:getExitPoint(i-1)
			local buyer = this:addPlayer('id_test'..p..i, posCustomers.x, posCustomers.y,
				{
					skin	= 'monkey7',
					role	= ROLE_BUYER,
					is_bot	= true
				})

			gameState:addNewBuyer(buyer)
		end

	end

	

	function this:updateInput()
		if global.isPopupOpened then
			this.input = {}
		end

		if this.input[H_RIGHT] then
			this.localInput.x = 1
		elseif this.input[H_LEFT] then
			this.localInput.x = -1
		else
			this.localInput.x = 0
		end

		if this.input[H_UP] then
			this.localInput.y = 1
		elseif this.input[H_DOWN] then
			this.localInput.y = -1
		else
			this.localInput.y = 0
		end

		if global.isGamePadDetected then
			if vmath.length(this.inputGamepad) > 0 then
				this.localInput.x = this.inputGamepad.x
				this.localInput.y = this.inputGamepad.y
				this.inputGamepad.x = 0
				this.inputGamepad.y = 0
			end
		end

		if this.controlId then
			local player = gameState.players[this.controlId]
			player:applyMoveInput(this.localInput, true)
		end

	end

	function this:analogInput(message)
		if ((message.x and message.y) or (message.position)) then
			local moveX = message.x or message.position.x
			local moveY = message.y or message.position.y

			this.localInput.x = moveX
			this.localInput.y = moveY

		end

		if ((message.touch ~= nil) and (message.touch == false)) then
			this.localInput.x = 0
			this.localInput.y = 0
		end

		if this.controlId then
			local player = gameState.players[this.controlId]
			player:applyMoveInput(this.localInput, true)
		end

	end

	function this:onInputDownDebug(cursor, action)
        local now = socket.gettime()
        table.insert(this.tap_times, now)

        for i = #this.tap_times, 1, -1 do
            if now - this.tap_times[i] > this.MAX_TAP_INTERVAL then
                table.remove(this.tap_times, i)
            end
        end

        if #this.tap_times >= 3 then
            this.tap_times = {}
            this:on_triple_tap(self)
        end

	end

	function this:on_triple_tap(index)
		msg.post(url_screen_gui_game, 'enable')

	end


    function this:onInputDown(cursor)
		if global.isShowDebug and (not global.isShowTiles) then
			lume.trace(cursor.x, cursor.y)
		end

	end

    function this:onInputUp(cursor)
		if global.isShowTiles then
			if global.isCtrlPressed then
				this:updateDebugGridCell(cursor.x, cursor.y, 3)	
				
				return nil
			end

			if global.isShiftPressed then
				this:updateDebugGridCell(cursor.x, cursor.y, 0)
			else
				if this.controlId and (not global.isShowGuiDebug) then
					this:followPoint(this.players[this.controlId], cursor.x, cursor.y)
				end
			end
		end

	end

    function this:onInputMove(cursor)

	end

    function this:update(self, dt)
		if (this.isGameStarted) then

			if global.isDesktop then
				this:updateInput()
			end

			for i, player in pairs(this.players) do
				player:update(dt)
			end

			this:updateIndicatorList()
			this:updateIndicatorGoldenPig()
			this:updateIndicatorSpeedBoots()

			for i, crab in pairs(this.listCrabs) do
				crab:update(dt)
			end

			if this.arrowDirectionPos then
				this:updateArrowHintDirection(this.arrowDirectionPos)
			end

		end

    end

    function this:final()

    end

    function this:on_message(self, message_id, message, sender)
		if message_id == hash("button_a") and message.released then
			lume.trace('button_a')

		elseif message_id == hash("activateBoost") then
			this:activateBoost(message.value)

		elseif message_id == hash("hideOffer") then
			this:hideOffer(message.value)

		elseif message_id == hash("updateHat") then
			this.ourPlayer:updateHat(message.value)
			apimanager.sendAnalytics('SELECT_HAT', message.value)

		elseif message_id == hash("check_boost_manager") then
			this:checkBoostManager()

		elseif message_id == hash("activate_fruit_boost") then
			local time = global.boost_min_iap * 60

			this:activateBoost('boost_coinsX2', time)
			this:activateBoost('boost_energyWork', time)
			this:activateBoost('boost_energyZavod', time)

		elseif message_id == hash("show_task") then
			this:showTaskPosition()

		elseif message_id == hash("test_control1") then
			this.controlId = this.ourPlayer.id
			setCamera("follow", this.players[this.controlId].view)

		elseif message_id == hash("test_control2") then
			this.controlId = this.dodikCustomer1.id
			setCamera("follow", this.players[this.controlId].view)

        elseif message_id == hash("test_addCoins") then
			coinmanager.plus_balance(5000)
			this:updateCoins()

        elseif message_id == hash("test_addCash") then
			this:updateCashboxAmount(50)

        elseif message_id == hash("test_addGems") then
			coinmanager.plus_balance(100, 'gems')
			msg.post(url_screen_gui_game, "update_gems")

		elseif message_id == hash("test_updateBots") then
			this:updateBots()

		elseif message_id == hash("test_updateZavods") then
			this:updateAllZavods()
			this:updateAllZavods()
			this:updateAllZavods()
			this:updateAllZavods()
			this:updateAllZavods()

		elseif message_id == hash("test_updateQueueCashbox") then
			this:updateQueueCashbox()

		elseif message_id == hash("test_bankomat") then
			this:timeForOffer("boost_bankomat")

		elseif message_id == hash("test_hooligan") then
			this:addHooligan(this.dodikHooligan)

		elseif message_id == hash("test_funsquad") then
			this:addFunSquad()

		elseif message_id == hash("test_parrot") then
			if this.parrot then
				this.parrot:fly(true)
			end

		elseif message_id == hash("on_btn_toypunch") then
			this:addTestToyPunch(message.value)

		elseif message_id == hash("on_btn_monkeypunch") then
			this.tickMonkeyPunch = TIME_MONKEY_PUNCH

		elseif message_id == hash("test_buyPlace") then
			if this.placeNumForSale > 0 then
				this:placeSetBought(this.listPlaceBoxes[this.placeNumForSale])
				this:checkNextPlaceSale(this.placeNumForSale)
				this:updateDebugEditorGrid()
			end

		elseif message_id == hash("test_12_items") then
			this.ourPlayer:setMaxFood(true)
			msg.post(url_popup_message, "show_message", {text_id = "12 ITEMS"})

        elseif message_id == hash("click_boost1") then
			msg.post(url_screen_gui_game, "setWindowOffer", {visible = true, type = "boost_energyZavod"})

        elseif message_id == hash("click_boost2") then
			msg.post(url_screen_gui_game, "setWindowOffer", {visible = true, type = "boost_energyWork"})

		elseif message_id == hash("click_boost3") then
			msg.post(url_screen_gui_game, "setWindowOffer", {visible = true, type = "boost_coinsX2"})

		elseif message_id == hash("on_btn_fillZavods") then
			this:fillZavods(1)

		elseif message_id == hash("on_btn_fillSklads") then
			this:fillSklads(5)

		elseif message_id == hash("on_btn_sleepZavods") then
			this:sleepZavods()

		elseif message_id == hash("on_btn_tilegrid") then
			global.isShowTiles = not global.isShowTiles

			msg.post(url_controller, "show_screen", {state="#proxy_game"})

		elseif message_id == hash("on_btn_editorgrid") then
			this:traceEditorMap()
			this:updateDebugEditorGrid()

        elseif message_id == hash("btn_skip_tutorial") then
			if this.isTutorial then
				msg.post(this.tutorial_arrow,"remove")
				msg.post(url_screen_gui_game, "updateButtons", {bool = true})
				msg.post(url_screen_gui_game, "updateTutorial", {bool = false})
				msg.post(url_popup_message, "updateArm", {bool = false})
				this.isTutorial = false

				msg.post(url_popup_message, "show_message", {text_id = "TUTORIAL_COMPLETED"})
			end

        elseif message_id == hash("btn_offer") then
			this.tickNewOffer = TIME_SHOW_OFFER - 1

        elseif message_id == hash("click_test1") then
			debug_manager.test1()

		elseif message_id == hash("click_test2") then
			debug_manager.test2()

		elseif message_id == hash("click_test3") then
			debug_manager.test3()

		elseif message_id == hash("click_test4") then
			debug_manager.test4()

        end

    end

    function this:on_input(self, action_id, action)
        if action_id == H_TOUCH then

			if global.isDesktop then
				if action.y > 80 then
				local cursor = camera.screen_to_world(hash("/cameraGame"), vmath.vector3(action.x, action.y, 0))
				if action.pressed then
					this:onInputDown(cursor)
				end
				if action.released then
					this:onInputUp(cursor)
				end
				if (not action.pressed) and (not action.released) then
					this:onInputMove(cursor)
				end
				end
			end

			if global.isDebug and action.pressed then
				this:onInputDownDebug(cursor, action)
			end

			this:checkInput()

		elseif (action_id == H_SPACE) then
			if (action.released) and (global.isDebug) then
				msg.post('.', "click_test1")
			end

		elseif (action_id == H_SHIFT) then
			if (action.pressed) then
				global.isShiftPressed = true
			end
			if (action.released) then
				global.isShiftPressed = false
			end

		elseif (action_id == H_CTRL) then
			if(global.isDebug and global.isShowTiles) then
				if (action.pressed) then
					global.isCtrlPressed = true
				end
				if (action.released) then
					global.isCtrlPressed = false
				end
			end

		elseif (action_id == H_KEY_M) then
			if (action.pressed) and (global.isAllowQA) then
				coinmanager.plus_balance(1000)
			end

		elseif action_id == hash("key_test") then
			if (action.pressed) then
				
			end

        end

		if action_id then
			if action.pressed then
				this.input[action_id] = true

			elseif action.released then
				this.input[action_id] = false

			end

			this:checkInput()

			if global.isGamePadDetected then
				if (action.value > 0) then
					if action_id == H_GAMEPAD_STICK_UP then
						this.inputGamepad.y = action.value
					elseif action_id == H_GAMEPAD_STICK_DOWN then
						this.inputGamepad.y = -action.value
					end

					if action_id == H_GAMEPAD_STICK_LEFT then
						this.inputGamepad.x = -action.value
					elseif action_id == H_GAMEPAD_STICK_RIGHT then
						this.inputGamepad.x = action.value
					end
				end

			end
		end

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
