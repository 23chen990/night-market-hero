DataMartH = {}

function DataMartH:init()
	local this = {}

    this.posDodik      		= {x = -340, y = -540}			
    
    

    this.limitMoveX 		= {min = -1500, max = 1500}
    this.limitMoveY 		= {min = -1100, max = 1100}

	this.posExit   			= vmath.vector3(-430, -780, 0)
	this.posStart   		= vmath.vector3(-370, -575, 0)
	this.posDancefloor		= vmath.vector3(-200, -240, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(-330, -590, 0)
	this.posManager   		= vmath.vector3(-35, -410, 0)
	this.posParrot   		= vmath.vector3(-850, 60, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(-450, -80, 0)

    this.posTrash      		= {frame='trash1', x = 105, y = -310, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = -510, y = -220, radius = 10, offsetY = 35}

	this.placesCamera		= {}
	this.placesAlert		= {}

	this.listSalesMain		= {}
	this.aimPlaces			= {}
	this.NUMPLACE_LAST		= 1
	this.NUMPLACE_ZAVOD		= 0				
	this.NUMPLACE_MIN		= 0				

	this.NUM_SALE_CRAZY		= 1
	this.NUM_SALE_OFFER		= 1
	this.NUM_SALE_PARROT	= 1

	this.typeFoodParrot		= 15

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

	this.pricePlaces		= global.pricePlacesH
    this.have_places		= global.have_placesH

	this.PLACES				= {}

    this.listPlaceBoxes		= {
							{
								link		= "placebox_cashbox",
								offsetY		= -40,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(140,-50,0),
								typeFood	= 0,
								countFood	= 0,
								maxCount	= 5,
								radius		= 20000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladCash,
								listFood	= {},
								places		= {}
							},
                            {
                                link		= "placebox_aim1",
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                radius		= 3000,
                                paid		= 0,
                                isActive	= false,
                                isHideSprite= true
                            },
							{
								link		= "placebox_aimM",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								radius		= 3000,
								paid		= 0,
								isActive	= false,
								isHideSprite= true
							},
                            {
                                link		= "placebox_aim2",
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                radius		= 3000,
                                paid		= 0,
                                isActive	= false,
                                isHideSprite= true
                            },
							{
								link		= "placebox_f29_1",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f29_2",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f29_3",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f29_4",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f29_5",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f29_6",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 29,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectPlant,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f30_1",					
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,-10,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod,
							},
							{
								link		= "placebox_f30_2",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f30_3",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f30_4",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f30_5",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f30_6",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-5,0),
								typeFood	= 30,
								countFood	= 2,
								maxCount	= 2,
								radius		= 2000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectMushroom,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_f29",				
								offsetY		= 35,
								offsetWork	= vmath.vector3(10,-105,0),
								typeFood	= 29,
								typeSklad	= 'sklad_3_stupeni',
								nameFood	= 'pumpkin',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f30",				
								offsetWork	= vmath.vector3(-20,-100,0),
								typeFood	= 30,
								typeSklad	= 'sklad_palet_15',
								nameFood	= 'mushroom',
								countFood	= 0,
								maxCount	= 15,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f31",				
								offsetWork	= vmath.vector3(-20,-100,0),
								typeFood	= 31,
								typeSklad	= 'sklad_brevna',
								nameFood	= 'potion',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								listFood	= {},
								places		= {}
							},
							
							{
								link		= "placebox_f31",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 31,
								countFood	= 0,
								maxCount	= 4,
								radius		= gameState.radiusZavod,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimeZavods,
								stamina		= gameState.defaultStamina,
								stamina_max	= gameState.defaultStamina,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								linkSklad	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_for_f31",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-105,0),
								offsetSklad	= vmath.vector3(-120,40,0),
								typeFood	= 30,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= gameState.radiusZavod,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= true,
								listFood	= {},
								places		= {}
							}
							
                        }

	

	this.map_width	= 35
	this.map_height	= 20

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,0,1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,0,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,2,2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,2,2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {261,295,296,331,332}
		elseif vNumPlaceBox == 17 then
			indexes = {397,398,399,432,433,434}
		elseif vNumPlaceBox == 18 then
			indexes = {341,342,343,376,377,378}
		elseif vNumPlaceBox == 19 then
			indexes = {543,544,545,578,579,580}
		elseif vNumPlaceBox == 21 then
			indexes = {406,407,408,409}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikManager:updateHat(5)
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)

		gameState.dodikAssist2:setOptions({maxFood = 3})

		
		gameState.dodikAssist2:setStockman(2, {
			this.PLACES["placebox_sklad_f29"].id,
			this.PLACES["placebox_sklad_f30"].id,
			this.PLACES["placebox_sklad_f31"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f29"].id,
			this.PLACES["placebox_sklad_f30"].id,
			this.PLACES["placebox_sklad_f31"].id,
			this.PLACES["placebox_f29_1"].id,
			this.PLACES["placebox_f29_2"].id,
			this.PLACES["placebox_f29_3"].id,
			this.PLACES["placebox_f29_4"].id,
			this.PLACES["placebox_f29_5"].id,
			this.PLACES["placebox_f29_6"].id,
			this.PLACES["placebox_f30_1"].id,
			this.PLACES["placebox_f30_2"].id,
			this.PLACES["placebox_f30_3"].id,
			this.PLACES["placebox_f30_4"].id,
			this.PLACES["placebox_f30_5"].id,
			this.PLACES["placebox_f30_6"].id,
			this.PLACES["placebox_f31"].id
		}

	end

	function this:updateDataMain()
		

		gameState.numSale		= global.numSaleH
		gameState.amountCashBox	= global.amount_cashboxH
		gameState.defauiltSklad = "placebox_sklad_f29"
		gameState.funsquadSklads = {29,30,31}

		lume.trace('this.listPlaceBoxes count', #this.listPlaceBoxes)

		local listSalesMain = {
			"placebox_cashbox",
			"placebox_sklad_f29",
			"placebox_f29_1",
			"placebox_f29_2",
			"placebox_sklad_f30",
			"placebox_f30_1",
			"placebox_f30_2",
			"placebox_sklad_f31",
			"placebox_sklad_for_f31"
		}

		local listPlacesCamera = {
			"placebox_cashbox",
			"placebox_sklad_f29",
			"placebox_f29_2",
			"placebox_sklad_f30",
			"placebox_f30_2",
			"placebox_sklad_f31"
		}

		local listPlacesAim = {
			"placebox_aimM",
			"placebox_aim1",
			"placebox_aim2"
		}

		for k,v in pairs(listSalesMain) do
			table.insert(this.listSalesMain, this.PLACES[v].id)
		end

		for k,v in pairs(listPlacesCamera) do
			table.insert(this.placesCamera, this.PLACES[v].id)
		end

		for k,v in pairs(listPlacesAim) do
			table.insert(this.aimPlaces, this.PLACES[v].id)
		end

		this.NUMPLACE_ZAVOD		= this.PLACES["placebox_sklad_for_f31"].id
		this.NUMPLACE_MIN		= this.PLACES["placebox_sklad_f29"].id

		this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]
		this.NUM_SALE_CRAZY		= 3
		this.NUM_SALE_OFFER		= 3
		this.NUM_SALE_PARROT	= 3
		this.NUM_SALE_SKLAD_2	= 7

		this.listUpgradesId		= {
			0,
			this.PLACES["placebox_aim2"].id,
			this.PLACES["placebox_sklad_for_f31"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f31"].id,this.PLACES["placebox_sklad_for_f31"].id}
		}

		if (global.numSaleH == 0) then
			global.amount_coinsH = 0
			local pos = vmath.vector3(-150, -150, 0)
			gameState:addDroppedObject(0, vmath.vector3(pos.x - 25 - 20, pos.y - 15, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x + 25 - 20, pos.y - 25, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x - 25, pos.y + 25, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x + 25, pos.y + 15, 0))
		end

	end

	function this:updateNumSale(vNumSale)
		global.numSaleH = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashboxH = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_levelH
		elseif (vType == 'upgrades_price') then
			return global.upgrades_priceH
		elseif (vType == 'upgrades_max') then
			return global.upgrades_maxH
		elseif (vType == 'list_id_dodiks') then
			return {2}
		elseif (vType == 'list_id_zavods') then
			return {3}
		elseif (vType == 'list_id_caravans') then
			return {}
		end

	end

	function this:updateAlertPlaces()
		this.placesAlert['potion']	= 'potion_appliance'
		this.placesAlert['id_a2']	= 'relax_place2'

	end

	function this:getAimzoneSprite(vId)
		local spriteName = nil

		if vId == this.PLACES["placebox_aim1"].id then
			spriteName = "icon_cashier2"
		elseif vId == this.PLACES["placebox_aim2"].id then
			spriteName = "icon_assistant2"
		end

		return spriteName

	end

	

	function this:initUpgrades()
		this.countUpgrades = #this.listUpgradesId

	end

	function this:getIndexUpgradeView(vIndex)
		local indexes = {1,2}
		return indexes[vIndex]
	end

	function this:getUpgradeDodik(vNum)
		local player = nil

		if vNum == 2 then
			player = gameState.dodikAssist2
		end

		return player
	end

	function this:getUpgradeZavod(vNum)
		local value1 = 0
		local value2 = 0
		local value3 = 0

		if vNum == 3 then
			value1	= this.placesUpgrade[1][1]
			value2	= this.placesUpgrade[1][2]
		end

		return {
			zavod = value1,
			zavodSklad = value2,
			zavodSklad2 = value3
		}
	end

	

	function this:getTilePlace(vNamePlace)
		local num = 0
		local tile = vmath.vector3(0,0,0)
		local isSkladPlace = false
		local isExitPlace = false
		local skladOffset = 180

		if vNamePlace == 'basket' then
			tile = gameState:getTileFromPos(this.posBasket.x, this.posBasket.y)
		elseif vNamePlace == 'cashier' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x - 150, placePos.y)
		elseif vNamePlace == 'cashbox' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x + 200, placePos.y + 150)
			isSkladPlace = true
			num = this.PLACES["placebox_cashbox"].id

		elseif vNamePlace == 'exit' then
			tile = gameState:getTileFromPos(this.posStart.x, this.posStart.y)
			isExitPlace = true

		elseif vNamePlace == 'dancefloor' then
			tile = gameState:getTileFromPos(this.posDancefloor.x, this.posDancefloor.y)

		elseif vNamePlace == 'trash' then
			tile = gameState:getTileFromPos(this.posTrash.x, this.posTrash.y)
		elseif vNamePlace == 'hooligan' then
			local pos = gameState.dodikHooligan.pos
			tile = gameState:getTileFromPos(pos.x, pos.y - 40)
		elseif vNamePlace == 'relax_place_m' then
			local placePos = this.PLACES["placebox_aimM"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'relax_place2' then
			local placePos = this.PLACES["placebox_aim2"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'relax_place3' then
			local placePos = this.PLACES["placebox_aim3"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'pumpkin' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f29"].id
			local placePos = this.PLACES["placebox_sklad_f29"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'mushroom' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f30"].id
			local placePos = this.PLACES["placebox_sklad_f30"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'potion' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f31"].id
			local placePos = this.PLACES["placebox_sklad_f31"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		
		elseif vNamePlace == 'pumpkin_zavod' then
			local placePos = this.PLACES["placebox_f29_1"].pos
			tile = gameState:getTileFromPos(placePos.x + 50, placePos.y - 80)

		elseif vNamePlace == 'mushroom_zavod' then
			local placePos = this.PLACES["placebox_f30_1"].pos
			tile = gameState:getTileFromPos(placePos.x - 50, placePos.y)

		elseif vNamePlace == 'potion_zavod' then
			tile = vmath.vector3(22,10,0)

		elseif vNamePlace == 'potion_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f31"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_f29_1"].isActive) then
			num = this.PLACES["placebox_sklad_f29"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f30_1"].isActive) then
			num = this.PLACES["placebox_sklad_f30"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f31"].isActive) then
			num = this.PLACES["placebox_sklad_f31"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f31"].id then
			countFood1 = this.PLACES["placebox_f31"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f31"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		end

		

		return isEmpty

	end

	function this:getWishList()
		local typesFood = {}
		local maxWishList = 1
		local maxFood = 1
		local listCountFood = {4,5,6,8,10,12,12,12}

		if (this.PLACES["placebox_f29_1"].isActive) then
			table.insert(typesFood, 29)
		end
		if (this.PLACES["placebox_f30_1"].isActive) then
			table.insert(typesFood, 30)
		end
		if (this.PLACES["placebox_f31"].isActive) then
			table.insert(typesFood, 31)
		end

		maxWishList = #typesFood
		maxFood = listCountFood[maxWishList]

		if (maxWishList > 6) then
			maxWishList = 6
		end

		return typesFood, maxWishList, maxFood
	end

	function this:getDataPlace(vPlaceId)
		local wishFood = {}

		
		if vPlaceId == this.PLACES["placebox_sklad_f29"].id then
			wishFood.type = this.PLACES["placebox_sklad_f29"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f29_1"].id,
				this.PLACES["placebox_f29_2"].id,
				this.PLACES["placebox_f29_3"].id,
				this.PLACES["placebox_f29_4"].id,
				this.PLACES["placebox_f29_5"].id,
				this.PLACES["placebox_f29_6"].id
			}
			wishFood.skladName = 'pumpkin'
			wishFood.zavodName = 'pumpkin_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f30"].id then
			wishFood.type = this.PLACES["placebox_sklad_f30"].typeFood
			wishFood.offsetY = 10
			wishFood.places_id = {
				this.PLACES["placebox_f30_1"].id,
				this.PLACES["placebox_f30_2"].id,
				this.PLACES["placebox_f30_3"].id,
				this.PLACES["placebox_f30_4"].id,
				this.PLACES["placebox_f30_5"].id,
				this.PLACES["placebox_f30_6"].id
			}
			wishFood.skladName = 'mushroom'
			wishFood.zavodName = 'mushroom_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f31"].id then
			wishFood.type = this.PLACES["placebox_sklad_f31"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f31"].id}
			wishFood.skladName = 'potion'
			wishFood.zavodName = 'potion_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_f30_1"].id then
			table.insert(listNum, "placebox_aim2")

		elseif vPrevPlaceId == this.PLACES["placebox_f29_2"].id then
			table.insert(listNum, "placebox_aim1")
			table.insert(listNum, "placebox_f29_3")
		elseif vPrevPlaceId == this.PLACES["placebox_f29_3"].id then
			table.insert(listNum, "placebox_f29_4")
		elseif vPrevPlaceId == this.PLACES["placebox_f29_4"].id then
			table.insert(listNum, "placebox_f29_5")
		elseif vPrevPlaceId == this.PLACES["placebox_f29_5"].id then
			table.insert(listNum, "placebox_f29_6")

		elseif vPrevPlaceId == this.PLACES["placebox_f30_2"].id then
			table.insert(listNum, "placebox_f30_3")
		elseif vPrevPlaceId == this.PLACES["placebox_f30_3"].id then
			table.insert(listNum, "placebox_f30_4")
		elseif vPrevPlaceId == this.PLACES["placebox_f30_4"].id then
			table.insert(listNum, "placebox_f30_5")
		elseif vPrevPlaceId == this.PLACES["placebox_f30_5"].id then
			table.insert(listNum, "placebox_f30_6")

		end

		if (#listNum > 0) then
			for k,v in pairs(listNum) do
				gameState:placeSetForSale(this.listPlaceBoxes[this.PLACES[v].id])
			end
		end

	end

	function this:placeCheckBought(vBoxId, vIsFromSave)
		if this.listPlaceBoxes[vBoxId].isActive then

			if vBoxId == this.PLACES["placebox_aim1"].id then
				gameState.dodikAssist1:updateVisible(true)
				gameState.dodikAssist1:showEffectExit()
				gameState.isHaveCashier = true

			elseif vBoxId == this.PLACES["placebox_aim2"].id then
				gameState.dodikAssist2:updateVisible(true)
				gameState.dodikAssist2:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_sklad_f29"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_f29_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_f30_1"].id then
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f31"].id then
				gameState:setZavodView(vBoxId, "placebox_f31", "applause")

				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)
				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

				if (not vIsFromSave) then
					
					datamanager.setHaveHats(22)
					msg.post(url_popup_shop, "bought_item", {index = 22, is_not_lock = true})

				end

			end

			if this.listPlaceBoxes[vBoxId].iconSklad then
				if vIsFromSave then
					msg.post(this.listPlaceBoxes[vBoxId].iconSklad, "show")
				else
					timer.delay(0.5, false, function()
						msg.post(this.listPlaceBoxes[vBoxId].iconSklad, "show")
					end)
				end
			end

			if this.listPlaceBoxes[vBoxId].carpet then
				msg.post(this.listPlaceBoxes[vBoxId].carpet, "show")
			end

			if this.listPlaceBoxes[vBoxId].carpet2 then
				msg.post(this.listPlaceBoxes[vBoxId].carpet2, "show")
			end

		end

	end

	

	function this:getExitPoint(vValue)
		local p = vmath.vector3()
		local r = vValue or math.random(0,8)
		p.x = this.posExit.x + 15*r
		p.y = this.posExit.y - 2*r

		return p
	end

	function this:addZavodViews()
		this.PLACES["placebox_f31"].linkSklad = this.PLACES["placebox_sklad_for_f31"].id

		gameState:addZavodObject('potion',	this.PLACES["placebox_f31"].id, this.PLACES["placebox_sklad_for_f31"].id)

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f31"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateSkladDecor("sklad_3_stupeni", "placebox_sklad_f29", "sklad_pumpkin1", vmath.vector3(1,0,0))
		gameState:updateSkladDecor("sklad_palet", "placebox_sklad_f30", "sklad_mushroom1", vmath.vector3(0,-3,0))
		gameState:updateSkladDecor("sklad_brevna", "placebox_sklad_f31", "sklad_potion1", vmath.vector3(0,2,0))

		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f31", "placebox_f31", "caildron1", vmath.vector3(2,-5,0))

		
		num = this.PLACES["placebox_f29_2"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x, y=box.y-35, z=DEEP_BACKGROUND})

		num = this.PLACES["placebox_f29_5"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x, y=box.y-35, z=DEEP_BACKGROUND})

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		gameState:addDecorObject('gate_cemetery1', vmath.vector3(this.posGateExit.x,this.posGateExit.y+207-250,0), 250)
		gameState:addDecorObject('column_cemetery3', vmath.vector3(this.posGateExit.x-153,this.posGateExit.y-5,0), 50)
		gameState:addDecorObject('column_cemetery3', vmath.vector3(this.posGateExit.x+165,this.posGateExit.y-35,0), 40)

		
		

		
		

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
