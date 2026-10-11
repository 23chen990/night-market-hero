DataMart1 = {}

function DataMart1:init()
	local this = {}

    this.posDodik      		= {x = -150, y = 300}			
    
    
    
    

    this.limitMoveX 		= {min = -1500, max = 1500}
    this.limitMoveY 		= {min = -900, max = 900}

    this.posExit   			= vmath.vector3(-110, 630, 0)
	this.posStart   		= vmath.vector3(-85, 410, 0)
	this.posDancefloor		= vmath.vector3(-200, 200, 0)

    this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(-85, 415, 0)
	this.posManager   		= vmath.vector3(-300, 350, 0)
	this.posParrot   		= vmath.vector3(-900, -385, 0)
	this.posGoldenPig  		= vmath.vector3(680, -380, 0)
	this.posDeliveryBoy		= vmath.vector3(-30, 280, 0)

	this.posTrash      		= {frame='trash1', x = -400, y = 380, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = 40, y = 300, radius = 10, offsetY = 35}

	this.placesCamera		= {2,10,13,14,16,21}
	this.placesAlert		= {}
    this.listSalesMain		= {7,5,1,2, 6,8,9,10, 11,13,14,16, 20,21,23,24, 32}
	this.bankomatValue		= {10,10,10,10,10, 10,10,10, 20,20,20,20, 70,80,100,100}
	this.aimPlaces			= {26,27,28,29,30,31}
	this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]
	this.NUMPLACE_ZAVOD		= 13
	this.NUMPLACE_MIN		= 8			

	this.typeFoodParrot		= 2

	this.countUpgrades		= 0
	this.listUpgradesId		= {0,27,28,29,30,13,16,21,24}
	this.placesUpgrade		= {
								{13,12},	
								{16,15},	
								{22,21},	
								{25,24}		
							}

    this.pricePlaces		= global.pricePlaces1
	this.have_places		= global.have_places1

	this.PLACES				= {}

    this.listPlaceBoxes		= {
                            {
                                link		= "placebox_f1_1",					
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-25,0),
                                typeFood	= 1,
                                countFood	= 3,
                                maxCount	= 3,
                                radius		= 2000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= 5,
                                stamina		= 1,
                                stamina_max	= 1,
                                isActive	= false,
                                isSelling	= false,
                                isZavod		= true,
                                callCollect	= gameState.collectBanana,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_f1_2",					
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-25,0),
                                typeFood	= 1,
                                countFood	= 3,
                                maxCount	= 3,
                                radius		= 2000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= 5,
                                stamina		= 1,
                                stamina_max	= 1,
                                isActive	= false,
                                isSelling	= false,
                                isZavod		= true,
                                callCollect	= gameState.collectBanana,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_f1_3",					
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-25,0),
                                typeFood	= 1,
                                countFood	= 3,
                                maxCount	= 3,
                                radius		= 2000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= 5,
                                stamina		= 1,
                                stamina_max	= 1,
                                isActive	= false,
                                isSelling	= false,
                                isZavod		= true,
                                callCollect	= gameState.collectBanana,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_f1_4",					
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-25,0),
                                typeFood	= 1,
                                countFood	= 3,
                                maxCount	= 3,
                                radius		= 2000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= 5,
                                stamina		= 1,
                                stamina_max	= 1,
                                isActive	= false,
                                isSelling	= false,
                                isZavod		= true,
                                callCollect	= gameState.collectBanana,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_sklad_f1",				
                                offsetWork	= vmath.vector3(-20,-100,0),
                                offsetBuy	= vmath.vector3(-40,-160,0),
                                typeFood	= 1,
								nameFood	= 'banan',
                                countFood	= 0,
                                maxCount	= 15,
                                radius		= gameState.radiusSklad,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isForBuyer	= true,
                                isPhysics	= true,
                                callInit 	= gameState.initSkladBanana,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_sklad_f2",				
                                offsetY		= 45,
                                offsetWork	= vmath.vector3(0,-50,0),
                                offsetBuy	= vmath.vector3(-40,-160,0),
                                typeFood	= 2,
								nameFood	= 'corn',
                                countFood	= 0,
                                maxCount	= 12,
                                radius		= gameState.radiusSklad,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isForBuyer	= true,
                                isPhysics	= true,
                                callInit 	= gameState.initSkladCorn,
                                listFood	= {},
                                places		= {}
                            },
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
                                link		= "placebox_f2_1",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_f2_2",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_f2_3",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_sklad_f3",				
								offsetY		= 20,
								offsetWork	= vmath.vector3(-10,-90,0),
								offsetBuy	= vmath.vector3(-30,-140,0),
								typeFood	= 3,
								typeSklad	= 'sklad_eggs',
								nameFood	= 'egg',
								countFood	= 0,
								maxCount	= 9,
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
                                link		= "placebox_sklad_for_f3",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 2,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= false,
                                callInit 	= gameState.initSkladCornForEgg,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f3",					
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 3,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 5000,
                                paid		= 0,
                                isActive	= false,
                                zavodTick	= 0,
                                zavodBuild	= gameState.buildTimeZavods,
                                stamina		= gameState.defaultStamina,
                                stamina_max	= gameState.defaultStamina,
                                isZavod		= true,
                                linkSklad	= 12,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_sklad_f4",				
                                offsetY		= 70,
                                offsetWork	= vmath.vector3(-10,-120,0),
                                offsetBuy	= vmath.vector3(-30,-160,0),
                                typeFood	= 4,
								nameFood	= 'milk',
                                countFood	= 0,
                                maxCount	= 9,
                                radius		= gameState.radiusSklad,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isForBuyer	= true,
                                isPhysics	= true,
                                isSprite2	= true,
                                offsetGraphic = vmath.vector3(0,27,0),
                                callInit 	= gameState.initSkladMilk,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_sklad_for_f4",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 2,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= false,
                                callInit 	= gameState.initSkladCornForMilk,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f4",					
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-7,3,0),
                                typeFood	= 4,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 5000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= gameState.buildTimeZavods,
                                stamina		= gameState.defaultStamina,
                                stamina_max	= gameState.defaultStamina,
                                isActive	= false,
                                isZavod		= true,
                                linkSklad	= 15,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_f2_4",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_f2_5",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_f2_6",					
                                offsetY		= 20,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-5,-20,0),
                                typeFood	= 2,
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
                                link		= "placebox_sklad_f5",				
                                offsetY		= 70,
                                offsetWork	= vmath.vector3(-20,-120,0),
                                offsetBuy	= vmath.vector3(-30,-170,0),
                                typeFood	= 5,
								nameFood	= 'popcorn',
                                countFood	= 0,
                                maxCount	= 12,
                                radius		= gameState.radiusSklad,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isForBuyer	= true,
                                isPhysics	= true,
                                isSprite2	= true,
								offsetGraphic = vmath.vector3(12,25,0),
                                callInit 	= gameState.initSkladPopCorn,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_sklad_for_f5",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-120,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
                                typeFood	= 2,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                callInit 	= gameState.initSkladCornForPopCorn,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f5",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(20,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 5,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= gameState.buildTimeZavods,
                                stamina		= gameState.defaultStamina,
                                stamina_max	= gameState.defaultStamina,
                                isActive	= false,
                                isZavod		= true,
                                isHideSprite= true,
                                linkSklad	= 21,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
                            {
                                link		= "placebox_sklad_f6",				
                                offsetY		= 70,
                                offsetWork	= vmath.vector3(-10,-120,0),
                                offsetBuy	= vmath.vector3(-30,-160,0),
                                typeFood	= 6,
								nameFood	= 'yogurt',
                                countFood	= 0,
                                maxCount	= 9,
                                radius		= gameState.radiusSklad,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isForBuyer	= true,
                                isPhysics	= true,
                                isSprite2	= true,
								offsetGraphic = vmath.vector3(0,27,0),
                                callInit 	= gameState.initSkladYogurt,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_sklad_for_f6",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-120,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
                                typeFood	= 1,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                callInit 	= gameState.initSkladBananaForYogurt,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f6",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(20,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 6,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                zavodTick	= 0,
                                zavodBuild	= gameState.buildTimeZavods,
                                stamina		= gameState.defaultStamina,
                                stamina_max	= gameState.defaultStamina,
                                isActive	= false,
                                isZavod		= true,
                                isHideSprite= true,
                                linkSklad	= 24,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
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
                                link		= "placebox_aim5",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                radius		= 3000,
                                paid		= 0,
                                isActive	= false,
                                isHideSprite= true
                            },
							{
								link		= "placebox_aim6",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								radius		= 3000,
								paid		= 0,
								isActive	= false,
								isHideSprite= true
							},
                            {
                                link		= "placebox_nextmart",				
                                offsetY		= 80,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(-350,-50,0),
                                radius		= 3000,
                                paid		= 0,
								isPhysics	= true,
                                isActive	= false
                            }
                        }

	

	this.map_width	= 30
	this.map_height	= 15

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,2,2,2,1,1,1,0,0,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,2,2,2,2,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,2,2,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 5 then
			indexes = {256,257,258,286,287,288}
		elseif vNumPlaceBox == 6 then
			indexes = {275,276,277}
		elseif vNumPlaceBox == 11 then
			indexes = {397,398}
		elseif vNumPlaceBox == 14 then
			indexes = {350,380}
		elseif vNumPlaceBox == 20 then
			indexes = {207,208,209}
		elseif vNumPlaceBox == 21 then
			indexes = {231,232,233,234,235}
		elseif vNumPlaceBox == 23 then
			indexes = {328,329}
		elseif vNumPlaceBox == 24 then
			indexes = {352,353,354,355,356}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)
		gameState.dodikAssist3:updateHat(1)
		gameState.dodikAssist4:updateHat(3)
		gameState.dodikAssist5:updateHat(4)
		gameState.dodikManager:updateHat(5)

		gameState.dodikAssist2:setOptions({maxFood = 3})
		gameState.dodikAssist2:setStockman(1, {5,20,23})
		gameState.dodikAssist2.allowWorkPlaces = {1,2,3,4,5,20,21,22,23,24,25}

		gameState.dodikAssist3:setOptions({maxFood = 3})
		gameState.dodikAssist3:setStockman(2, {6,11,14})
		gameState.dodikAssist3.allowWorkPlaces = {8,9,10,17,18,19,6,13,11,16,14}

		gameState.dodikAssist4:setOptions({maxFood = 3})
		gameState.dodikAssist4:setStockman(3, {12,15})
		gameState.dodikAssist4.allowWorkPlaces = {8,9,10,17,18,19,12,15}

		gameState.dodikAssist5:setOptions({maxFood = 3})
		gameState.dodikAssist5:setStockman(4, {21,24})
		gameState.dodikAssist5.allowWorkPlaces = {1,2,3,4,8,9,10,17,18,19,21,24}

	end

	function this:updateDataMain()
		if (global.numSale1 == 0) then
			global.amount_coins1 = datamanager.get_start_coins(1, this.listSalesMain, {1,2,3})
		end

		gameState.numSale		= global.numSale1
		gameState.amountCashBox	= global.amount_cashbox1
		gameState.defauiltSklad = "placebox_sklad_f1"
		gameState.funsquadSklads = {1,2}

		local dataSalesNum = datamanager.get_num_sale_values(1)
		this.NUM_SALE_CRAZY		= dataSalesNum[1]
		this.NUM_SALE_OFFER		= dataSalesNum[2]
		this.NUM_SALE_PARROT	= dataSalesNum[3]
		this.NUM_SALE_ZAVOD		= dataSalesNum[4]
		this.NUM_SALE_SKLAD_2	= dataSalesNum[5]

	end

	function this:updateAlertPlaces()
		this.placesAlert['cow'] = 'cow_animal'
		this.placesAlert['chicken'] = 'chicken_animal'
		this.placesAlert['popcorn'] = 'popcorn_appliance'
		this.placesAlert['yogurt'] = 'yogurt_appliance'
		this.placesAlert['id_a2'] = 'relax_place1'
		this.placesAlert['id_a3'] = 'relax_place2'
		this.placesAlert['id_a4'] = 'relax_place3'
		this.placesAlert['id_a5'] = 'relax_place4'

	end

	function this:updateNumSale(vNumSale)
		global.numSale1 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox1 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level1
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price1
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max1
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4,5,10}
		elseif (vType == 'list_id_zavods') then
			return {6,7,8,9}
		elseif (vType == 'list_id_caravans') then
			return {}
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
			spriteName = "icon_farmer2"
		elseif vId == this.PLACES["placebox_aim5"].id then
			spriteName = "icon_chef2"
		end

		return spriteName

	end

	

	function this:initUpgrades()
		this.countUpgrades = #this.listUpgradesId

	end

	function this:getIndexUpgradeView(vIndex)
		local indexes = {1,3,2,4,5,6,7,8,9}
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
		elseif vNum == 5 then
			player = gameState.dodikAssist5
		elseif vNum == 10 then
			player = gameState.dodikManager
		end

		return player
	end

	function this:getUpgradeZavod(vNum)
		local value1 = 0
		local value2 = 0
		local value3 = 0

		if vNum == 6 then
			value1	= this.placesUpgrade[1][1]
			value2	= this.placesUpgrade[1][2]
		elseif vNum == 7 then
			value1	= this.placesUpgrade[2][1]
			value2	= this.placesUpgrade[2][2]
		elseif vNum == 8 then
			value1	= this.placesUpgrade[3][1]
			value2	= this.placesUpgrade[3][2]
		elseif vNum == 9 then
			value1	= this.placesUpgrade[4][1]
			value2	= this.placesUpgrade[4][2]
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

		if vNamePlace == 'basket' then
			tile = vmath.vector3(16,12,0)

		elseif vNamePlace == 'banan' then
			tile = vmath.vector3(16,7,0)
			isSkladPlace = true
			num = 5

		elseif vNamePlace == 'corn' then
			tile = vmath.vector3(5,8,0)
			isSkladPlace = true
			num = 6

		elseif vNamePlace == 'corn_chicken' then
			tile = vmath.vector3(0,9,0)

		elseif vNamePlace == 'corn_cow' then
			tile = vmath.vector3(11,2,0)

		elseif vNamePlace == 'egg' then
			tile = vmath.vector3(7,12,0)
			isSkladPlace = true
			num = 11

		elseif vNamePlace == 'milk' then
			tile = vmath.vector3(19,10,0)
			isSkladPlace = true
			num = 14

		elseif vNamePlace == 'popcorn' then
			tile = vmath.vector3(27,5,0)
			isSkladPlace = true
			num = 20

		elseif vNamePlace == 'yogurt' then
			tile = vmath.vector3(27,9,0)
			isSkladPlace = true
			num = 23

		elseif vNamePlace == 'cashier' then
			tile = vmath.vector3(9,9,0)

		elseif vNamePlace == 'cashbox' then
			tile = vmath.vector3(13,9,0)
			isSkladPlace = true
			num = 7

		elseif vNamePlace == 'exit' then
			tile = vmath.vector3(15,12,0)
			isExitPlace = true

		elseif vNamePlace == 'dancefloor' then
			tile = gameState:getTileFromPos(this.posDancefloor.x, this.posDancefloor.y)

		elseif vNamePlace == 'trash' then
			tile = vmath.vector3(11,12,0)

		elseif vNamePlace == 'relax_place1' then
			local placePos = this.PLACES["placebox_aim2"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)
			

		elseif vNamePlace == 'relax_place2' then
			local placePos = this.PLACES["placebox_aim3"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)
			

		elseif vNamePlace == 'relax_place3' then
			local placePos = this.PLACES["placebox_aim4"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)
			

		elseif vNamePlace == 'relax_place4' then
			local placePos = this.PLACES["placebox_aim5"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)
			

		elseif vNamePlace == 'relax_place_m' then
			tile = vmath.vector3(13,12,0)

		elseif vNamePlace == 'banan_zavod' then
			tile = vmath.vector3(15,4,0)

		elseif vNamePlace == 'corn_zavod' then
			tile = vmath.vector3(10,5,0)

		elseif vNamePlace == 'egg_zavod' then
			tile = vmath.vector3(2,10,0)

		elseif vNamePlace == 'milk_zavod' then
			tile = vmath.vector3(10,3,0)

		elseif vNamePlace == 'popcorn_zavod' then
			tile = vmath.vector3(23,6,0)

		elseif vNamePlace == 'yogurt_zavod' then
			tile = vmath.vector3(24,10,0)

		elseif vNamePlace == 'popcorn_zavod_chef' then
			tile = vmath.vector3(21,6,0)

		elseif vNamePlace == 'yogurt_zavod_chef' then
			tile = vmath.vector3(22,10,0)

		elseif vNamePlace == 'cow_animal' then
			
			tile = vmath.vector3(13,3,0)
		elseif vNamePlace == 'chicken_animal' then
			tile = vmath.vector3(0,10,0)
		elseif vNamePlace == 'popcorn_appliance' then
			tile = vmath.vector3(22,6,0)
		elseif vNamePlace == 'yogurt_appliance' then
			tile = vmath.vector3(23,10,0)
		elseif vNamePlace == 'hooligan' then
			local pos = gameState.dodikHooligan.pos
			tile = gameState:getTileFromPos(pos.x, pos.y - 40)

		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if this.listPlaceBoxes[1].isActive then
			num = 5
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if this.listPlaceBoxes[8].isActive then
			num = 6
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if this.listPlaceBoxes[13].isActive then
			num = 11
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if this.listPlaceBoxes[16].isActive then
			num = 14
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if this.listPlaceBoxes[21].isActive then
			num = 20
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if this.listPlaceBoxes[24].isActive then
			num = 23
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false

		if vId == 23 then
			if (this.listPlaceBoxes[25].countFood == 0) and (this.listPlaceBoxes[24].countFood == 0) then
				isEmpty = true
			end
		elseif vId == 20 then
			if (this.listPlaceBoxes[22].countFood == 0) and (this.listPlaceBoxes[21].countFood == 0) then
				isEmpty = true
			end
		elseif vId == 11 then
			if (this.listPlaceBoxes[13].countFood == 0) and (this.listPlaceBoxes[12].countFood == 0) then
				isEmpty = true
			end
		elseif vId == 14 then
			if (this.listPlaceBoxes[16].countFood == 0) and (this.listPlaceBoxes[15].countFood == 0) then
				isEmpty = true
			end
		end

		return isEmpty

	end

	function this:getWishList()
		local typesFood = {}
		local maxWishList = 1
		local maxFood = 1

		if (this.listPlaceBoxes[1].isActive) then	
			table.insert(typesFood, 1)
			maxWishList = 1
			maxFood = 4
		end
		if (this.listPlaceBoxes[8].isActive) then	
			table.insert(typesFood, 2)
			maxWishList = 2
			maxFood = 5
		end
		if (this.listPlaceBoxes[13].isActive) then	
			table.insert(typesFood, 3)
			maxWishList = 3
			maxFood = 6
		end
		if (this.listPlaceBoxes[16].isActive) then	
			table.insert(typesFood, 4)
			maxWishList = 4
			maxFood = 8
		end
		if (this.listPlaceBoxes[21].isActive) then	
			table.insert(typesFood, 5)
			maxWishList = 5
			maxFood = 10
		end
		if (this.listPlaceBoxes[24].isActive) then	
			table.insert(typesFood, 6)
			maxWishList = 6
			maxFood = 12
		end

		return typesFood, maxWishList, maxFood
	end

	function this:getDataPlace(vPlaceId)
		local wishFood = {}

		
		if vPlaceId == 5 then                   
			wishFood.type = 1
			wishFood.offsetY = 35
			wishFood.places_id = {1,2,3,4}
			wishFood.skladName = 'banan'
			wishFood.zavodName = 'banan_zavod'
		elseif vPlaceId == 20 then              
			wishFood.type = 5
			wishFood.offsetY = 95
			wishFood.places_id = {22}
			wishFood.skladName = 'popcorn'
			wishFood.zavodName = 'popcorn_zavod'
		elseif vPlaceId == 23 then              
			wishFood.type = 6
			wishFood.offsetY = 95
			wishFood.places_id = {25}
			wishFood.skladName = 'yogurt'
			wishFood.zavodName = 'yogurt_zavod'

		
		elseif vPlaceId == 6 then               
			wishFood.type = 2
			wishFood.offsetY = 27
			wishFood.places_id = {8,9,10,17,18,19}
			wishFood.skladName = 'corn'
			wishFood.zavodName = 'corn_zavod'
		elseif vPlaceId == 11 then              
			wishFood.type = 3
			wishFood.offsetY = 35
			wishFood.places_id = {13}
			wishFood.skladName = 'egg'
			wishFood.zavodName = 'egg_zavod'
		elseif vPlaceId == 14 then              
			wishFood.type = 4
			wishFood.offsetY = 35
			wishFood.places_id = {16}
			wishFood.skladName = 'milk'
			wishFood.zavodName = 'milk_zavod'

		
		elseif vPlaceId == 12 then              
			wishFood.type = 2
			wishFood.offsetY = 27
			wishFood.places_id = {10,9,8,17,18,19}
			wishFood.skladName = 'corn_chicken'
			wishFood.zavodName = 'corn_zavod'
		elseif vPlaceId == 15 then              
			wishFood.type = 2
			wishFood.offsetY = 27
			wishFood.places_id = {10,9,8,17,18,19}
			wishFood.skladName = 'corn_cow'
			wishFood.zavodName = 'corn_zavod'

		
		elseif vPlaceId == 21 then              
			wishFood.type = 2
			wishFood.offsetY = 27
			wishFood.places_id = {10,9,8,17,18,19}
			wishFood.skladName = 'popcorn_zavod_chef'
			wishFood.zavodName = 'corn_zavod'
		elseif vPlaceId == 24 then              
			wishFood.type = 1
			wishFood.offsetY = 35
			wishFood.places_id = {1,2,3,4}
			wishFood.skladName = 'yogurt_zavod_chef'
			wishFood.zavodName = 'banan_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		

		if vPrevPlaceId == 14 then
			gameState:placeSetForSale(this.listPlaceBoxes[3])
		elseif vPrevPlaceId == 3 then
			gameState:placeSetForSale(this.listPlaceBoxes[4])
		elseif vPrevPlaceId == 21 then
			gameState:placeSetForSale(this.listPlaceBoxes[27])	
		elseif vPrevPlaceId == 13 then
			gameState:placeSetForSale(this.listPlaceBoxes[26])	
			gameState:placeSetForSale(this.listPlaceBoxes[17])	
		elseif vPrevPlaceId == 9 then
			gameState:placeSetForSale(this.listPlaceBoxes[28])	
		elseif vPrevPlaceId == 16 then
			gameState:placeSetForSale(this.listPlaceBoxes[29])	
		elseif vPrevPlaceId == 17 then
			gameState:placeSetForSale(this.listPlaceBoxes[18])
		elseif vPrevPlaceId == 18 then
			gameState:placeSetForSale(this.listPlaceBoxes[19])
		elseif vPrevPlaceId == 24 then
			
			gameState:placeSetForSale(this.listPlaceBoxes[30])	
		end

	end

	function this:placeCheckBought(vBoxId, vIsFromSave)
		if this.listPlaceBoxes[vBoxId].isActive then
			if vBoxId == 13 then
				local num = 12
				local object = this.listPlaceBoxes[vBoxId].objectBoost
				msg.post(object.panel.root, "show")
				msg.post(object.view, "updateVisible", { value = true} )
				msg.post(this.listPlaceBoxes[num].graphic, "enable")

				if (not vIsFromSave) then
					msg.post(this.listPlaceBoxes[num].graphic, "setTweenEffect")
				end

				this.listPlaceBoxes[num].isActive = true

				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

				if gameState.isBoostZavods then
					msg.post(object.boost, "show")
				end

				if (not vIsFromSave) then
					msg.post(url_screen_gui_game, "showQuestButton")
					quest_manager.reset()
					quest_manager.checkQuest('login')
				end

			elseif vBoxId == 16 then
				local num = 15
				local object = this.listPlaceBoxes[vBoxId].objectBoost
				msg.post(object.panel.root, "show")
				msg.post(object.view, "updateVisible", { value = true} )
				msg.post(this.listPlaceBoxes[num].graphic, "enable")

				if (not vIsFromSave) then
					msg.post(this.listPlaceBoxes[num].graphic, "setTweenEffect")
				end

				this.listPlaceBoxes[num].isActive = true

				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

				if gameState.isBoostZavods then
					msg.post(object.boost, "show")
				end

				if (not vIsFromSave) then
					gameState.isBoughtCow = true
				end

				
				gameState:addManager()

			elseif vBoxId == 20 then
				
				
				

			elseif vBoxId == 21 then
				local num = this.PLACES["placebox_f5"].id
				local panel = this.listPlaceBoxes[vBoxId].objectPanel
				local object = this.listPlaceBoxes[vBoxId].objectBoost
				msg.post(panel.root, "show")
				msg.post(this.listPlaceBoxes[num].tree, "show")

				if (not vIsFromSave) then
					msg.post(this.listPlaceBoxes[num].tree, "setTweenEffect")
				end

				this.listPlaceBoxes[num].isActive = true

				if gameState.isBoostZavods then
					msg.post(object.boost, "show")
				end

				if (not vIsFromSave) then
					datamanager.check_daily_bonus(false, 2.5, true)
				end

			elseif vBoxId == 24 then
				local num = this.PLACES["placebox_f6"].id
				local panel = this.listPlaceBoxes[vBoxId].objectPanel
				local object = this.listPlaceBoxes[vBoxId].objectBoost
				msg.post(panel.root, "show")
				msg.post(this.listPlaceBoxes[num].tree, "show")

				if (not vIsFromSave) then
					msg.post(this.listPlaceBoxes[num].tree, "setTweenEffect")
				end

				this.listPlaceBoxes[num].isActive = true

				if gameState.isBoostZavods then
					msg.post(object.boost, "show")
				end

			elseif vBoxId == 26 then
				gameState.dodikAssist1:updateVisible(true)
				gameState.dodikAssist1:showEffectExit()
				gameState.isHaveCashier = true

			elseif vBoxId == 27 then
				gameState.dodikAssist2:updateVisible(true)
				gameState.dodikAssist2:showEffectExit()

			elseif vBoxId == 28 then
				gameState.dodikAssist3:updateVisible(true)
				gameState.dodikAssist3:showEffectExit()

			elseif vBoxId == 29 then
				gameState.dodikAssist4:updateVisible(true)
				gameState.dodikAssist4:showEffectExit()

			elseif vBoxId == 30 then
				gameState.dodikAssist5:updateVisible(true)
				gameState.dodikAssist5:showEffectExit()

			elseif vBoxId == 1 then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == 8 then
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

				if (global.numEvent ~= 0) then
					if (not vIsFromSave) then
						msg.post(url_screen_gui_game, "show_event_btn")
					end

				end

			elseif vBoxId == 32 then
				gameState:placeShowNextMart(true, vmath.vector3(-200, 10 - 50, 0))

				if (global.numSale2 == 0) then
					gameState:showHint(true, 3, 'arrow', vmath.vector3(this.posNextMarket.x, this.posNextMarket.y - 200, 0), 230)

					gameState.isHintTime = true

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

		end

	end

	

	function this:getExitPoint(vValue)
		local p = vmath.vector3()
		local r = vValue or math.random(0,8)
		p.x = this.posExit.x + 30*r
		p.y = this.posExit.y - 5*r

		return p
	end

    function this:addZavodViews()
		gameState:addZavodObject('cow', 16, 15)
		gameState:addZavodObject('chicken', 13, 12)
		gameState:addZavodObject('yogurt', 25, 24)
		gameState:addZavodObject('popcorn', 22, 21)

		table.insert(gameState.listAnimalObjects, {id_zavod = 1, type = 'cow'})
		table.insert(gameState.listAnimalObjects, {id_zavod = 2, type = 'chicken'})

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, 13)
		gameState:boostZavod(vBool, 16)
		gameState:boostZavod(vBool, 22)
		gameState:boostZavod(vBool, 25)

	end

	

	function this:addGraphicsPlaces()
		local carpetPlace5 = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[5].x-10, y=this.listPlaceBoxes[5].y-73, z=DEEP_BACKGROUND})
		local carpetPlace6 = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[6].x-7, y=this.listPlaceBoxes[6].y-100, z=DEEP_BACKGROUND})
		local carpetPlace20 = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[20].x-15, y=this.listPlaceBoxes[20].y-115, z=DEEP_BACKGROUND})
		local carpetPlace21 = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[21].x-9, y=this.listPlaceBoxes[21].y-45, z=DEEP_BACKGROUND})
		local carpetPlace24 = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[24].x-9, y=this.listPlaceBoxes[24].y-45, z=DEEP_BACKGROUND})

		local carpetPlace7 = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[7].x-40, y=this.listPlaceBoxes[7].y-20, z=DEEP_BACKGROUND})
		local carpetPlace11 = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[11].x-6, y=this.listPlaceBoxes[11].y-85, z=DEEP_BACKGROUND})
		local carpetPlace14 = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[14].x-3, y=this.listPlaceBoxes[14].y-122, z=DEEP_BACKGROUND})
		local carpetPlace23 = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[23].x-3, y=this.listPlaceBoxes[23].y-122, z=DEEP_BACKGROUND})

		addGraphic({sprite="place_corn1", x=this.listPlaceBoxes[9].x, y=this.listPlaceBoxes[9].y-30, z=DEEP_BACKGROUND})
		addGraphic({sprite="place_corn1", x=this.listPlaceBoxes[18].x, y=this.listPlaceBoxes[18].y-30, z=DEEP_BACKGROUND})

		local popcorn_machine = gameState:addDecorObject('microwave1', vmath.vector3(this.listPlaceBoxes[21].x,this.listPlaceBoxes[21].y+10,0), 36)
		local yogurt_machine = gameState:addDecorObject('yogurt_machine1', vmath.vector3(this.listPlaceBoxes[24].x,this.listPlaceBoxes[24].y+10,0), 37)

		this.listPlaceBoxes[22].tree = popcorn_machine
		this.listPlaceBoxes[25].tree = yogurt_machine

		local iconSklad1 = gameState:addDecorObject('sklad_banana1', vmath.vector3(this.listPlaceBoxes[5].x+18,this.listPlaceBoxes[5].y-16,0), 98)
		local iconSklad2 = gameState:addDecorObject('sklad_corn1', vmath.vector3(this.listPlaceBoxes[6].x+8,this.listPlaceBoxes[6].y-45-1,0), 127)
		local iconSklad3 = gameState:addDecorObject('sklad_milk1', vmath.vector3(this.listPlaceBoxes[14].x-7,this.listPlaceBoxes[14].y-70-1,0), 166)
		local iconSklad4 = gameState:addDecorObject('sklad_popcorn1', vmath.vector3(this.listPlaceBoxes[20].x+1,this.listPlaceBoxes[20].y-70-1,0), 165)
		local iconSklad5 = gameState:addDecorObject('sklad_togurt1', vmath.vector3(this.listPlaceBoxes[23].x-7,this.listPlaceBoxes[23].y-70-1,0), 166)

		msg.post(popcorn_machine, "hide")
		msg.post(yogurt_machine, "hide")
		msg.post(iconSklad1, "hide")
		msg.post(iconSklad2, "hide")
		msg.post(iconSklad3, "hide")
		msg.post(iconSklad4, "hide")
		msg.post(iconSklad5, "hide")
		msg.post(carpetPlace5, "hide")
		msg.post(carpetPlace6, "hide")
		msg.post(carpetPlace20, "hide")
		msg.post(carpetPlace21, "hide")
		msg.post(carpetPlace24, "hide")
		msg.post(carpetPlace7, "hide")
		msg.post(carpetPlace11, "hide")
		msg.post(carpetPlace14, "hide")
		msg.post(carpetPlace23, "hide")

		this.listPlaceBoxes[5].iconSklad = iconSklad1
		this.listPlaceBoxes[6].iconSklad = iconSklad2
		this.listPlaceBoxes[14].iconSklad = iconSklad3
		this.listPlaceBoxes[20].iconSklad = iconSklad4
		this.listPlaceBoxes[23].iconSklad = iconSklad5

		this.listPlaceBoxes[5].carpet = carpetPlace5
		this.listPlaceBoxes[6].carpet = carpetPlace6
		this.listPlaceBoxes[20].carpet = carpetPlace20
		this.listPlaceBoxes[21].carpet = carpetPlace21
		this.listPlaceBoxes[24].carpet = carpetPlace24
		this.listPlaceBoxes[7].carpet = carpetPlace7
		this.listPlaceBoxes[11].carpet = carpetPlace11
		this.listPlaceBoxes[14].carpet = carpetPlace14
		this.listPlaceBoxes[23].carpet = carpetPlace23

	end

	function this:addDecorBack()
		local d = nil
		gameState:addDecorObject('gate1_up', vmath.vector3(this.posGateExit.x-6,this.posGateExit.y-45,0), 130+45)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x-102,this.posGateExit.y-8,0), 50)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x+111,this.posGateExit.y-41,0), 50)

        gameState:addDecorObject('billboard1', vmath.vector3(900,480,0), 110)
        gameState:addDecorObject('billboard2', vmath.vector3(300,520,0), 30)

        gameState:addDecorObject('vase2', vmath.vector3(-622,375,0), 50)
        gameState:addDecorObject('wall1', vmath.vector3(-355,425,0), 50)
        gameState:addDecorObject('wall1', vmath.vector3(-604,464,0), 50)
        gameState:addDecorObject('column1', vmath.vector3(-740,480,0), 70)
        gameState:addDecorObject('column2', vmath.vector3(-880,500,0), 40)
        d = gameState:addDecorObject('palm_column1', vmath.vector3(-970,470,0), 110, true, -15)
		msg.post(d, "setScale", {value = 0.9})

        gameState:addDecorObject('fence1', vmath.vector3(-1200,400-70,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(-1350,350-70,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(-1383,275-70,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(-1470,155-70,0), 30)

        d = gameState:addDecorObject('palm_column1', vmath.vector3(-1590,110-70,0), 110, true, -15)
		msg.post(d, "setScale", {value = 0.9})

        gameState:addDecorObject('fence1', vmath.vector3(-1472,-534,0), 30)
        gameState:addDecorObject('fence1', vmath.vector3(-1350,-550,0), 30)
        gameState:addDecorObject('fence2', vmath.vector3(-1185,-570,0), 30)

        gameState:addDecorObject('fence1', vmath.vector3(-350,-710,0), 30)
        gameState:addDecorObject('fence2', vmath.vector3(-510,-690,0), 30)
        gameState:addDecorObject('fence1', vmath.vector3(-632,-674,0), 30)

        d = gameState:addDecorObject('palm_column1', vmath.vector3(440,-620-20,0), 110, true, -15)	
		msg.post(d, "setScale", {value = 0.9})

        d = gameState:addDecorObject('palm_column1', vmath.vector3(570,-605,0), 75, false, -12)	
		msg.post(d, "setScale", {value = 0.75})

        gameState:addDecorObject('brench1', vmath.vector3(670,-670,0), 15)
        gameState:addDecorObject('vase2', vmath.vector3(810,-670,0), 50)

        gameState:addDecorObject('fence1', vmath.vector3(940,-790,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(1017,-761,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(1075,-610,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(1107,-535,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(1139,-460,0), 30)
        gameState:addDecorObject('fence3', vmath.vector3(1171,-385,0), 30)

        gameState:addDecorObject('wall1', vmath.vector3(200-10,350,0), 50)
        gameState:addDecorObject('wall1', vmath.vector3(449-10,311,0), 50)
        gameState:addDecorObject('column1', vmath.vector3(596-10,280,0), 70)

        gameState:addDecorObject('palm_column1', vmath.vector3(730-10,280,0), 140)
        gameState:addDecorObject('wall1', vmath.vector3(840-10,280,0), 20)
        gameState:addDecorObject('wall1', vmath.vector3(830+249-10,250-39,0), 50)

        gameState:addDecorObject('column1', vmath.vector3(1225-10,185,0), 70)
        gameState:addDecorObject('wall2', vmath.vector3(1160,40,0), 100)
        gameState:addDecorObject('column1', vmath.vector3(1105,-15,0), 70)
        gameState:addDecorObject('vase1', vmath.vector3(1075,-90,0), 50)

        gameState:addDecorObject('palm_column1', vmath.vector3(1280,160-20,0), 140)
        gameState:addDecorObject('brench3', vmath.vector3(1230,20,0), 30)
        gameState:addDecorObject('brench2', vmath.vector3(1410,65,0), 45)

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
