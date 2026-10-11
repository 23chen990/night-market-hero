DataMartC = {}

function DataMartC:init()
	local this = {}

    this.posDodik      		= {x = 1425, y = -125}			
    
    
    
    
    
    

	this.limitMoveX 		= {min = -1600, max = 1600}
    this.limitMoveY 		= {min = -1200, max = 1200}

	this.posExit   			= vmath.vector3(1585, -70, 0)
	this.posStart   		= vmath.vector3(1370, -100, 0)
	this.posDancefloor		= vmath.vector3(0, 80, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(1355, -120, 0)
	this.posManager   		= vmath.vector3(960, -240, 0)
	this.posParrot   		= vmath.vector3(0, 0, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(550, -200, 0)

	this.posTrash      		= {frame='trash1', x = 730, y = -340, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = 1120, y = -280, radius = 10, offsetY = 35}

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
	this.NUM_SALE_SKLAD_2	= 6

	this.typeFoodParrot		= 32

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

	this.pricePlaces		= global.pricePlacesC
    this.have_places		= global.have_placesC

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
								link		= "placebox_aim3",
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                radius		= 3000,
                                paid		= 0,
                                isActive	= false,
                                isHideSprite= true
                            },
                            {
								link		= "placebox_aim4",					
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
								link		= "placebox_f33_1",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_2",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_3",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_4",					
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_5",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_6",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_7",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f33_8",
								offsetY		= 25,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-25,0),
								typeFood	= 33,
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
								callCollect	= gameState.collectPeanut,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_f33",				
								offsetWork	= vmath.vector3(-20,-100,0),
								typeFood	= 33,
								typeSklad	= 'sklad_palet_12',
								nameFood	= 'christmas_tree',
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
								link		= "placebox_sklad_f32",
								offsetY		= 35,
								offsetWork	= vmath.vector3(10,-105,0),
								typeFood	= 32,
								typeSklad	= 'sklad_3_stupeni',
								nameFood	= 'cookie',
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
								link		= "placebox_sklad_f18",
								offsetY		= 45,
								offsetWork	= vmath.vector3(-15,-80,0),
								typeFood	= 18,
								typeSklad	= 'sklad_3_polki',
								nameFood	= 'flour',
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
								link		= "placebox_sklad_f34",
								offsetWork	= vmath.vector3(-20,-100,0),
								typeFood	= 34,
								typeSklad	= 'sklad_brevna',
								nameFood	= 'wreath',
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
								link		= "placebox_f32",
								offsetY		= 0,
								offsetWork	= vmath.vector3(30,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 32,
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
								link		= "placebox_sklad_for_f32",
								offsetY		= -80,
								offsetWork	= vmath.vector3(-20,-70,0),
                                offsetBuy	= vmath.vector3(130,-30,0),
								offsetPlaha	= vmath.vector3(-15,-160,0),
								offsetSklad	= vmath.vector3(-43,-68,0),
								typeFood	= 18,
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
							},
							{
								link		= "placebox_f34",
								offsetY		= 0,
								offsetWork	= vmath.vector3(30,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 34,
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
								link		= "placebox_sklad_for_f34",
								offsetY		= -80,
								offsetWork	= vmath.vector3(-20,-70,0),
								offsetBuy	= vmath.vector3(130,-30,0),
								offsetPlaha	= vmath.vector3(-15,-160,0),
								offsetSklad	= vmath.vector3(-43,-68,0),
								typeFood	= 33,
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
							},
							{
								link		= "placebox_caravan",
								offsetY		= 0,
								offsetWork	= vmath.vector3(-10,-60,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								offsetDrive	= vmath.vector3(210,600,0),
								offsetFood	= vmath.vector3(-5,-58,0),
								typeFood	= 18,
								countFood	= 0,
								maxCount	= 4,
								radius		= gameState.radiusZavod,
								paid		= 0,
								workState	= 0,
								workTick	= 10,
								workReload	= 12,
								isPhysics	= true,
								isActive	= false,
								isCaravan	= true,
								isHideSprite= true,
								callCollect	= gameState.updateViewFood
							}
                        }

	

	this.map_width	= 35
	this.map_height	= 20

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,0,0,
						1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {272,273,307,308,343}
		elseif vNumPlaceBox == 16 then
			indexes = {88,89,90,123,124,125}
		elseif vNumPlaceBox == 19 then
			indexes = {229,230,231,264,265,266}
		elseif vNumPlaceBox == 23 then
			indexes = {222,257,292,293,328}
		elseif vNumPlaceBox == 18 then
			indexes = {481,482,483}
		elseif vNumPlaceBox == 17 then
			indexes = {406,407,408,441,442,443}
		elseif vNumPlaceBox == 21 then
			indexes = {434,435,470,505,506}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikManager:updateHat(5)
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)
		gameState.dodikAssist3:updateHat(1)
		gameState.dodikAssist4:updateHat(4)

		gameState.dodikAssist2:setOptions({maxFood = 3})	
		gameState.dodikAssist3:setOptions({maxFood = 3})	
		gameState.dodikAssist4:setOptions({maxFood = 3})	

		
		gameState.dodikAssist2:setStockman(2, {
			this.PLACES["placebox_sklad_f33"].id,
			this.PLACES["placebox_sklad_f34"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f33"].id,
			this.PLACES["placebox_sklad_f34"].id,
			this.PLACES["placebox_f33_1"].id,
			this.PLACES["placebox_f33_2"].id,
			this.PLACES["placebox_f33_3"].id,
			this.PLACES["placebox_f33_4"].id,
			this.PLACES["placebox_f33_5"].id,
			this.PLACES["placebox_f33_6"].id,
			this.PLACES["placebox_f33_7"].id,
			this.PLACES["placebox_f33_8"].id,
			this.PLACES["placebox_f34"].id
		}

		gameState.dodikAssist3:setStockman(3, {
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f32"].id
		})

		gameState.dodikAssist3.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f32"].id,
			this.PLACES["placebox_caravan"].id,
			this.PLACES["placebox_f32"].id
		}

		gameState.dodikAssist4:setStockman(4, {
			this.PLACES["placebox_sklad_for_f34"].id,
			this.PLACES["placebox_sklad_for_f32"].id
		})

		gameState.dodikAssist4.allowWorkPlaces = {
			this.PLACES["placebox_sklad_for_f32"].id,
			this.PLACES["placebox_sklad_for_f34"].id,
			this.PLACES["placebox_f33_1"].id,
			this.PLACES["placebox_f33_2"].id,
			this.PLACES["placebox_f33_3"].id,
			this.PLACES["placebox_f33_4"].id,
			this.PLACES["placebox_f33_5"].id,
			this.PLACES["placebox_f33_6"].id,
			this.PLACES["placebox_f33_7"].id,
			this.PLACES["placebox_f33_8"].id,
			this.PLACES["placebox_caravan"].id
		}

	end

	function this:updateDataMain()
		

		gameState.numSale		= global.numSaleC
		gameState.amountCashBox	= global.amount_cashboxC
		gameState.defauiltSklad = "placebox_sklad_f33"
		gameState.funsquadSklads = {33,32,34}

		local listSalesMain = {
			"placebox_cashbox",
			"placebox_sklad_f33",
			"placebox_f33_1",
			"placebox_f33_2",
			"placebox_sklad_f34",
			"placebox_sklad_for_f34",
			"placebox_sklad_f18",
			"placebox_caravan",
			"placebox_sklad_f32",
			"placebox_sklad_for_f32"
		}

		local listPlacesCamera = {
			"placebox_cashbox",
			"placebox_sklad_f33",
			"placebox_f33_2",
			"placebox_sklad_f34",
			"placebox_sklad_for_f34",
			"placebox_sklad_f18",
			"placebox_caravan",
			"placebox_sklad_f32",
			"placebox_sklad_f32"
		}

		local listPlacesAim = {
			"placebox_aimM",
			"placebox_aim1",
			"placebox_aim2",
			"placebox_aim3",
			"placebox_aim4"
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

		this.NUMPLACE_ZAVOD		= this.PLACES["placebox_sklad_for_f34"].id
		this.NUMPLACE_MIN		= this.PLACES["placebox_sklad_f33"].id

		this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]
		this.NUM_SALE_CRAZY		= 3
		this.NUM_SALE_OFFER		= 3
		this.NUM_SALE_PARROT	= 3

		this.listUpgradesId		= {
			0,
			this.PLACES["placebox_aim2"].id,
			this.PLACES["placebox_aim3"].id,
			this.PLACES["placebox_aim4"].id,
			this.PLACES["placebox_sklad_for_f34"].id,
			this.PLACES["placebox_sklad_for_f32"].id,
			this.PLACES["placebox_caravan"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f34"].id,this.PLACES["placebox_sklad_for_f34"].id},
			{this.PLACES["placebox_f32"].id,this.PLACES["placebox_sklad_for_f32"].id}
		}

		if (global.numSaleC == 0) then
			global.amount_coinsC = 0
			local pos = vmath.vector3(1150, -50, 0)
			gameState:addDroppedObject(0, vmath.vector3(pos.x - 25 - 20, pos.y - 15, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x + 25 - 20, pos.y - 25, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x - 25, pos.y + 25, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x + 25, pos.y + 15, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x - 25 - 40, pos.y - 15 - 40, 0))
			gameState:addDroppedObject(0, vmath.vector3(pos.x + 25 - 40, pos.y - 25 - 40, 0))
		end

	end

	function this:updateAlertPlaces()
		this.placesAlert['cookie']	= 'cookie_appliance'
		this.placesAlert['wreath']	= 'wreath_appliance'
		this.placesAlert['id_a2']	= 'relax_place2'
		this.placesAlert['id_a3']	= 'relax_place3'
		this.placesAlert['id_a4']	= 'relax_place4'

	end

	function this:updateNumSale(vNumSale)
		global.numSaleC = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashboxC = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_levelC
		elseif (vType == 'upgrades_price') then
			return global.upgrades_priceC
		elseif (vType == 'upgrades_max') then
			return global.upgrades_maxC
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4}
		elseif (vType == 'list_id_zavods') then
			return {5,6}
		elseif (vType == 'list_id_caravans') then
			return {7}
		end

	end

	function this:getAimzoneSprite(vId)
		local spriteName = nil

		if vId == this.PLACES["placebox_aim1"].id then
			spriteName = "icon_cashier2"
		elseif vId == this.PLACES["placebox_aim2"].id then
			spriteName = "icon_assistant2"
		elseif vId == this.PLACES["placebox_aim3"].id then
			spriteName = "icon_assistant2"
		elseif vId == this.PLACES["placebox_aim4"].id then
			spriteName = "icon_chef2"
		end

		return spriteName

	end

	

	function this:initUpgrades()
		this.countUpgrades = #this.listUpgradesId

	end

	function this:getIndexUpgradeView(vIndex)
		local indexes = {0,1,2,3,4,5,6}
		return indexes[vIndex]
	end

	function this:getUpgradeDodik(vNum)
		local player = nil

		if vNum == 2 then
			player = gameState.dodikAssist2
		elseif vNum == 3 then
			player = gameState.dodikAssist3
		elseif vNum == 4 then
			player = gameState.dodikAssist4
		end

		return player
	end

	function this:getUpgradeZavod(vNum)
		local value1 = 0
		local value2 = 0
		local value3 = 0

		if vNum == 5 then
			value1	= this.placesUpgrade[1][1]
			value2	= this.placesUpgrade[1][2]
		elseif vNum == 6 then
			value1	= this.placesUpgrade[2][1]
			value2	= this.placesUpgrade[2][2]
		end

		return {
			zavod = value1,
			zavodSklad = value2,
			zavodSklad2 = value3
		}
	end

	function this:getUpgradeCaravan(vNum)
		if vNum == 7 then
			return this.PLACES["placebox_caravan"].id
		end

	end

	

	function this:getTilePlace(vNamePlace)
		local num = 0
		local tile = vmath.vector3(0,0,0)
		local isSkladPlace = false
		local isExitPlace = false
		local skladOffset = 180

		if vNamePlace == 'basket' then
			tile = gameState:getTileFromPos(this.posBasket.x - 50, this.posBasket.y - 50)
		elseif vNamePlace == 'cashier' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x - 150, placePos.y)
		elseif vNamePlace == 'cashbox' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x + 250, placePos.y + 100)
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

		elseif vNamePlace == 'relax_place4' then
			local placePos = this.PLACES["placebox_aim4"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == global.foodName[18] then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f18"].id
			local placePos = this.PLACES["placebox_sklad_f18"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == global.foodName[32] then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f32"].id
			local placePos = this.PLACES["placebox_sklad_f32"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == global.foodName[33] then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f33"].id
			local placePos = this.PLACES["placebox_sklad_f33"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 150)

		elseif vNamePlace == global.foodName[34] then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f34"].id
			local placePos = this.PLACES["placebox_sklad_f34"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		
		elseif vNamePlace == 'christmas_tree_zavod' then
			tile = vmath.vector3(11,3,0)

		elseif vNamePlace == 'wreath_zavod' then
			tile = vmath.vector3(13,8,0)

		elseif vNamePlace == 'flour_zavod' then
			local placePos = this.PLACES["placebox_caravan"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 140)

		elseif vNamePlace == 'cookie_zavod' then
			tile = vmath.vector3(15,13,0)

		elseif vNamePlace == 'cookie_zavod_chef' then
			tile = vmath.vector3(14,11,0)

		elseif vNamePlace == 'wreath_zavod_chef' then
			tile = vmath.vector3(12,6,0)

		elseif vNamePlace == 'cookie_appliance' then
			tile = vmath.vector3(15,12,0)

		elseif vNamePlace == 'wreath_appliance' then
			tile = vmath.vector3(12,7,0)

		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_caravan"].isActive) then
			num = this.PLACES["placebox_sklad_f18"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f33_1"].isActive) then
			num = this.PLACES["placebox_sklad_f33"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f32"].isActive) then
			num = this.PLACES["placebox_sklad_f32"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f34"].isActive) then
			num = this.PLACES["placebox_sklad_f34"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f32"].id then
			countFood1 = this.PLACES["placebox_f32"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f32"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f34"].id then
			countFood1 = this.PLACES["placebox_f34"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f34"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f18"].id then
			countFood1 = this.PLACES["placebox_caravan"].countFood

			if (countFood1 == 0) then
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

		if (this.PLACES["placebox_caravan"].isActive) then
			table.insert(typesFood, 18)
		end
		if (this.PLACES["placebox_f32"].isActive) then
			table.insert(typesFood, 32)
		end
		if (this.PLACES["placebox_f33_1"].isActive) then
			table.insert(typesFood, 33)
		end
		if (this.PLACES["placebox_f34"].isActive) then
			table.insert(typesFood, 34)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f33"].id then
			wishFood.type = this.PLACES["placebox_sklad_f33"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f33_1"].id,
				this.PLACES["placebox_f33_2"].id,
				this.PLACES["placebox_f33_3"].id,
				this.PLACES["placebox_f33_4"].id,
				this.PLACES["placebox_f33_5"].id,
				this.PLACES["placebox_f33_6"].id,
				this.PLACES["placebox_f33_7"].id,
				this.PLACES["placebox_f33_8"].id
			}
			wishFood.skladName = 'christmas_tree'
			wishFood.zavodName = 'christmas_tree_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f34"].id then
			wishFood.type = this.PLACES["placebox_sklad_f34"].typeFood
			wishFood.offsetX = 65
			wishFood.offsetY = 80
			wishFood.places_id = {this.PLACES["placebox_f34"].id}
			wishFood.skladName = 'wreath'
			wishFood.zavodName = 'wreath_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f18"].id then
			wishFood.type = this.PLACES["placebox_sklad_f18"].typeFood
			wishFood.offsetY = 120
			wishFood.places_id = {this.PLACES["placebox_caravan"].id}
			wishFood.skladName = 'flour'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f32"].id then
			wishFood.type = this.PLACES["placebox_sklad_f32"].typeFood
			wishFood.offsetX = 65
			wishFood.offsetY = 80
			wishFood.places_id = {this.PLACES["placebox_f32"].id}
			wishFood.skladName = 'cookie'
			wishFood.zavodName = 'cookie_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f32"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f32"].typeFood
			wishFood.offsetY = 120
			wishFood.places_id = {this.PLACES["placebox_caravan"].id}
			wishFood.skladName = 'cookie_zavod_chef'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f34"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f34"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f33_1"].id,
				this.PLACES["placebox_f33_2"].id,
				this.PLACES["placebox_f33_3"].id,
				this.PLACES["placebox_f33_4"].id,
				this.PLACES["placebox_f33_5"].id,
				this.PLACES["placebox_f33_6"].id,
				this.PLACES["placebox_f33_7"].id,
				this.PLACES["placebox_f33_8"].id
			}
			wishFood.skladName = 'wreath_zavod_chef'
			wishFood.zavodName = 'christmas_tree_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_sklad_for_f34"].id then
			table.insert(listNum, "placebox_aim2")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f32"].id then
			table.insert(listNum, "placebox_aim3")
			table.insert(listNum, "placebox_aim4")

		elseif vPrevPlaceId == this.PLACES["placebox_f33_2"].id then
			table.insert(listNum, "placebox_aim1")
			table.insert(listNum, "placebox_f33_3")
		elseif vPrevPlaceId == this.PLACES["placebox_f33_3"].id then
			table.insert(listNum, "placebox_f33_4")
		elseif vPrevPlaceId == this.PLACES["placebox_f33_4"].id then
			table.insert(listNum, "placebox_f33_5")
		elseif vPrevPlaceId == this.PLACES["placebox_f33_5"].id then
			table.insert(listNum, "placebox_f33_6")
		elseif vPrevPlaceId == this.PLACES["placebox_f33_6"].id then
			table.insert(listNum, "placebox_f33_7")
		elseif vPrevPlaceId == this.PLACES["placebox_f33_7"].id then
			table.insert(listNum, "placebox_f33_8")

		end

		if (#listNum > 0) then
			for k,v in pairs(listNum) do
				gameState:placeSetForSale(this.listPlaceBoxes[this.PLACES[v].id])
			end
		end

	end

	function this:placeCheckBought(vBoxId, vIsFromSave)
		if this.listPlaceBoxes[vBoxId].isActive then

			if vBoxId == this.PLACES["placebox_cashbox"].id then
				if gameState.isBoostCoinsX2 then
					msg.post(gameState.effectBoostCash, "updateVisible", { value = true} )
				end

			elseif vBoxId == this.PLACES["placebox_aim1"].id then
				gameState.dodikAssist1:updateVisible(true)
				gameState.dodikAssist1:showEffectExit()
				gameState.isHaveCashier = true

			elseif vBoxId == this.PLACES["placebox_aim2"].id then
				gameState.dodikAssist2:updateVisible(true)
				gameState.dodikAssist2:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_aim3"].id then
				gameState.dodikAssist3:updateVisible(true)
				gameState.dodikAssist3:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_aim4"].id then
				gameState.dodikAssist4:updateVisible(true)
				gameState.dodikAssist4:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_sklad_f34"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_f33_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f32"].id then
				gameState:setZavodView(vBoxId, "placebox_f32", "applause")
				msg.post(this.dodikCooker1, "updateVisible", { value = true} )

				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

				if (not vIsFromSave) then
					
					datamanager.setHaveHats(24)
					msg.post(url_popup_shop, "bought_item", {index = 24, is_not_lock = true})

				end

			elseif vBoxId == this.PLACES["placebox_sklad_for_f34"].id then
				gameState:setZavodView(vBoxId, "placebox_f34", "applause")
				msg.post(this.dodikCooker2, "updateVisible", { value = true} )

				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_caravan"].id then
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)
				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

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
		p.x = this.posExit.x - 10*r
		p.y = this.posExit.y - 30*r

		return p
	end

	function this:addZavodViews()
		this.PLACES["placebox_f32"].linkSklad = this.PLACES["placebox_sklad_for_f32"].id
		this.PLACES["placebox_f34"].linkSklad = this.PLACES["placebox_sklad_for_f34"].id

		gameState:addZavodObject('cookie',	this.PLACES["placebox_f32"].id, this.PLACES["placebox_sklad_for_f32"].id)
		gameState:addZavodObject('wreath',	this.PLACES["placebox_f34"].id, this.PLACES["placebox_sklad_for_f34"].id)

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f32"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f34"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateSkladDecor("sklad_3_stupeni", "placebox_sklad_f32", "sklad_cookie1", vmath.vector3(0,2,0))
		gameState:updateSkladDecor("sklad_palet", "placebox_sklad_f33", "sklad_christmas_tree1", vmath.vector3(0,-1,0))
		gameState:updateSkladDecor("sklad_brevna", "placebox_sklad_f34", "sklad_wreath1", vmath.vector3(0,5,0))
		gameState:updateSkladDecor("sklad_3_polki", "placebox_sklad_f18", "sklad_flour1", vmath.vector3(0,0,0))

		gameState:updateZavodDecor("zavod_simple_v", "placebox_sklad_for_f32", "placebox_f32", "cookie_maker1", vmath.vector3(2,35,0))
		gameState:updateZavodDecor("zavod_simple_v", "placebox_sklad_for_f34", "placebox_f34", "wreath_maker1", vmath.vector3(-2,42,0))

		
		num = this.PLACES["placebox_f33_1"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x-45, y=box.y-135, z=DEEP_BACKGROUND})

		num = this.PLACES["placebox_f33_8"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x-45, y=box.y-135, z=DEEP_BACKGROUND})

		
		num = this.PLACES["placebox_sklad_for_f32"].id
		box = this.listPlaceBoxes[num]

		local posCooker1 = vmath.vector3(box.x - 85, box.y + 5, 0)

		this.dodikCooker1 = gameState:addDodikDecor(posCooker1.x, posCooker1.y, {skin = 'monkey9', hat = 'hat45'})
		msg.post(this.dodikCooker1, "updateFlip", { value = true} )
		msg.post(this.dodikCooker1, "updateVisible", { value = false} )
		msg.post(this.dodikCooker1, "updatePosZ", { pos = posCooker1} )

		this.PLACES["placebox_sklad_for_f32"].objectBoost.cooker = this.dodikCooker1

		
		num = this.PLACES["placebox_sklad_for_f34"].id
		box = this.listPlaceBoxes[num]

		local posCooker2 = vmath.vector3(box.x - 85, box.y + 5, 0)

		this.dodikCooker2 = gameState:addDodikDecor(posCooker2.x, posCooker2.y, {skin = 'monkey9', hat = 'hat45'})
		msg.post(this.dodikCooker2, "updateFlip", { value = true} )
		msg.post(this.dodikCooker2, "updateVisible", { value = false} )
		msg.post(this.dodikCooker2, "updatePosZ", { pos = posCooker2} )

		this.PLACES["placebox_sklad_for_f34"].objectBoost.cooker = this.dodikCooker2

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		gameState:addDecorObject('gate_christmas1', vmath.vector3(this.posGateExit.x-4,this.posGateExit.y+146-270,0), 270)
		gameState:addDecorObject('column_snowy1', vmath.vector3(this.posGateExit.x-49,this.posGateExit.y-123,0), 60)
		gameState:addDecorObject('column_snowy1', vmath.vector3(this.posGateExit.x+50,this.posGateExit.y+116,0), 60)

		gameState:addDecorObject('christmas_tree', vmath.vector3(-680,155,0), 180)

		
		

		
		

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
