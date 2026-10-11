DataMart6 = {}

function DataMart6:init()
	local this = {}

    this.posDodik      		= {x = -920, y = 145}		
    
    
    
    
    

	this.limitMoveX 		= {min = -1820, max = 1820}
    this.limitMoveY 		= {min = -1100, max = 1100}

	this.posExit   			= vmath.vector3(-1220-100, 150+70, 0)
	this.posStart   		= vmath.vector3(-1240, 150, 0)
	this.posDancefloor		= vmath.vector3(-450, 50, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(-913, 227, 0)
	this.posManager   		= vmath.vector3(-830, -215, 0)
	this.posParrot   		= vmath.vector3(852, 545, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(-700, 140, 0)

	this.posTrash      		= {frame='trash1', x = -795, y = -90, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = -1145, y = 257, radius = 10, offsetY = 35}

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

	this.typeFoodParrot		= 44

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

	this.pricePlaces		= global.pricePlaces6
    this.have_places		= global.have_places6

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
								link		= "placebox_nextmart",
								offsetY		= 80,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(125,-200,0),
								radius		= 3000,
								paid		= 0,
								isActive	= false,
								isPhysics	= true
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
								link		= "placebox_f40_1",
								offsetY		= 45,
								offsetWork	= vmath.vector3(-18,-90,0),
								offsetBuy	= vmath.vector3(16,-46,0),
								offsetGet	= vmath.vector3(-15,-80,0),
								typeFood	= 40,
								countFood	= 2,
								maxCount	= 2,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f40_2",
								offsetY		= 45,
								offsetWork	= vmath.vector3(-18,-90,0),
								offsetBuy	= vmath.vector3(16,-46,0),
								offsetGet	= vmath.vector3(-15,-80,0),
								typeFood	= 40,
								countFood	= 2,
								maxCount	= 2,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f40_3",
								offsetY		= 45,
								offsetWork	= vmath.vector3(-18,-90,0),
								offsetBuy	= vmath.vector3(16,-46,0),
								offsetGet	= vmath.vector3(-15,-80,0),
								typeFood	= 40,
								countFood	= 2,
								maxCount	= 2,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f42_1",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 42,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f42_2",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 42,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f42_3",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 42,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f42_4",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 42,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f43_1",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(6,-55,0),
								typeFood	= 43,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f43_2",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(6,-55,0),
								typeFood	= 43,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f43_3",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(6,-55,0),
								typeFood	= 43,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f43_4",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(6,-55,0),
								typeFood	= 43,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f44_1",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-30,0),
								offsetBuy	= vmath.vector3(4,-41,0),
								typeFood	= 44,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f44_2",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-30,0),
								offsetBuy	= vmath.vector3(4,-41,0),
								typeFood	= 44,
								countFood	= 1,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f44_3",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-30,0),
								offsetBuy	= vmath.vector3(4,-41,0),
								typeFood	= 44,
								countFood	= 2,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f44_4",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-30,0),
								offsetBuy	= vmath.vector3(4,-41,0),
								typeFood	= 44,
								countFood	= 3,
								maxCount	= 3,
								radius		= 3000,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								callCollect	= gameState.collectThreeFood,
								updateZavod	= gameState.updateZavod
							},
							
							{
								link		= "placebox_sklad_f40",
								typeFood	= 40,
								typeSklad	= 'sklad_palet_15',
								iconFrame	= 'sklad_water1',
								offsetIcon  = vmath.vector3(0,2,0),
								offsetWork	= vmath.vector3(-20,-100,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f41",
								offsetY		= 5,
								typeFood	= 41,
								typeSklad	= 'sklad_morozilka',
								iconFrame	= 'sklad_ice1',
								offsetIcon  = vmath.vector3(5,4,0),
								offsetWork	= vmath.vector3(-10,-80,0),
								isActive	= false,
								isPhysics	= true,
								isSprite2	= true,
								offsetGraphic = vmath.vector3(-3,-22,0),
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f42",
								typeFood	= 42,
								typeSklad	= 'sklad_2_paleta',
								iconFrame	= 'sklad_mango1',
								offsetIcon  = vmath.vector3(2,2,0),
								offsetWork	= vmath.vector3(-20,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f43",
								typeFood	= 43,
								typeSklad	= 'sklad_2_paleta',
								iconFrame	= 'sklad_lemon1',
								offsetIcon  = vmath.vector3(2,2,0),
								offsetWork	= vmath.vector3(-20,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f44",
								typeFood	= 44,
								typeSklad	= 'sklad_2_paleta',
								iconFrame	= 'sklad_coconut1',
								offsetIcon  = vmath.vector3(2,2,0),
								offsetWork	= vmath.vector3(-20,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f45",
								offsetY		= 35,
								typeFood	= 45,
								typeSklad	= 'sklad_3_stupeni',
								iconFrame	= 'sklad_coconut_juice1',
								offsetIcon  = vmath.vector3(0,1,0),
								offsetWork	= vmath.vector3(10,-105,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f46",
								offsetY		= 5,
								typeFood	= 46,
								typeSklad	= 'sklad_morozilka',
								iconFrame	= 'sklad_mango_ice_cream1',
								offsetIcon  = vmath.vector3(6,2,0),
								offsetWork	= vmath.vector3(-10,-80,0),
								isActive	= false,
								isPhysics	= true,
								isSprite2	= true,
								offsetGraphic = vmath.vector3(-3,-22,0),
								isWarehouse	= true
							},
							{
                                link		= "placebox_sklad_f47",
								offsetY		= 45-2,
                                typeFood	= 47,
								typeSklad	= 'sklad_3_polki',
								iconFrame	= 'sklad_lemonade1',
								offsetIcon  = vmath.vector3(-2,3,0),
								offsetWork	= vmath.vector3(-10,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
                            },
							
							{
								link		= "placebox_f41",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 41,
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
								link		= "placebox_sklad_for_f41",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-115,35,0),
								typeFood	= 40,
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
								link		= "placebox_f45",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 45,
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
								link		= "placebox_sklad_for_f45",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-115,35,0),
								typeFood	= 44,
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
								link		= "placebox_f46",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 46,
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
								link		= "placebox_sklad_for_f46",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-115,35,0),
								typeFood	= 42,
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
								link		= "placebox_sklad_for_f47",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,30,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-175,45,0),
								offsetPlaha	= vmath.vector3(-60,10,0),
								typeFood	= 43,
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
								link		= "placebox_sklad_for_f47_2",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-15,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-2,-8,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								typeFood	= 41,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= gameState.radiusZavod,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= false,
								isHideSprite= true,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f47",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-8,-2,0),
								offsetBoost	= vmath.vector3(72,-18,0),
								typeFood	= 47,
								countFood	= 0,
								maxCount	= 4,
								radius		= gameState.radiusZavod,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimeZavods,
								stamina		= gameState.defaultStamina,
								stamina_max	= gameState.defaultStamina,
								isMultiple	= true,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								linkSklad	= 0,
								linkSklad2	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							}
							
                        }

	

	this.map_width	= 36
	this.map_height	= 24

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,2,2,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,2,1,2,2,2,2,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,0,0,1,2,2,2,2,1,1,1,1,
						0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,
						1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,1,1,
						1,1,0,0,0,0,0,0,1,2,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,1,2,2,1,1,1,
						0,0,0,0,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {586,622,623,659}
		elseif vNumPlaceBox == 25 then
			indexes = {482,483,484,518,519,520}
		elseif vNumPlaceBox == 26 then
			indexes = {342,343,344,378,379,380}
		elseif vNumPlaceBox == 27 then
			indexes = {231,232,233,234,235}
		elseif vNumPlaceBox == 28 then
			indexes = {313,314,346,347,348,349,350}
		elseif vNumPlaceBox == 29 then
			indexes = {775,776,777,778,811,812,813,814}
		elseif vNumPlaceBox == 30 then
			indexes = {572,573,574,608,609}
		elseif vNumPlaceBox == 31 then
			indexes = {370,371,372,406,407,408}
		elseif vNumPlaceBox == 32 then
			indexes = {282,283,284}
		elseif vNumPlaceBox == 34 then
			indexes = {635,636,637,638}
		elseif vNumPlaceBox == 36 then
			indexes = {752,753,754,755,756}
		elseif vNumPlaceBox == 38 then
			indexes = {259,260,261,262,263}
		elseif vNumPlaceBox == 39 then
			indexes = {426,428,429,430,431,461,462,463,464}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikManager:updateHat(5)
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)
		gameState.dodikAssist3:updateHat(1)
		gameState.dodikAssist4:updateHat(1)
		gameState.dodikAssist5:updateHat(4)
		gameState.dodikAssist6:updateHat(4)

		gameState.dodikAssist2:setOptions({maxFood = 3})	
		gameState.dodikAssist3:setOptions({maxFood = 3})	
		gameState.dodikAssist4:setOptions({maxFood = 3})	
		gameState.dodikAssist5:setOptions({maxFood = 3})	
		gameState.dodikAssist6:setOptions({maxFood = 3})	

		
		gameState.dodikAssist2:setStockman(2, {
			this.PLACES["placebox_sklad_f40"].id,
			this.PLACES["placebox_sklad_f44"].id,
			this.PLACES["placebox_sklad_f41"].id
		})

		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f40"].id,
			this.PLACES["placebox_sklad_f44"].id,
			this.PLACES["placebox_sklad_f41"].id,
			this.PLACES["placebox_f40_1"].id,
			this.PLACES["placebox_f40_2"].id,
			this.PLACES["placebox_f40_3"].id,
			this.PLACES["placebox_f44_1"].id,
			this.PLACES["placebox_f44_2"].id,
			this.PLACES["placebox_f44_3"].id,
			this.PLACES["placebox_f44_4"].id,
			this.PLACES["placebox_f41"].id
		}

		gameState.dodikAssist3:setStockman(3, {				
			this.PLACES["placebox_sklad_f42"].id,
			this.PLACES["placebox_sklad_f43"].id,
			this.PLACES["placebox_sklad_f46"].id
		})

		gameState.dodikAssist3.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f42"].id,
			this.PLACES["placebox_sklad_f43"].id,
			this.PLACES["placebox_sklad_f46"].id,
			this.PLACES["placebox_f42_1"].id,
			this.PLACES["placebox_f42_2"].id,
			this.PLACES["placebox_f42_3"].id,
			this.PLACES["placebox_f42_4"].id,
			this.PLACES["placebox_f43_1"].id,
			this.PLACES["placebox_f43_2"].id,
			this.PLACES["placebox_f43_3"].id,
			this.PLACES["placebox_f43_4"].id,
			this.PLACES["placebox_f46"].id
		}

		gameState.dodikAssist4:setStockman(4, {				
			this.PLACES["placebox_sklad_f45"].id,
			this.PLACES["placebox_sklad_f47"].id
		})

		gameState.dodikAssist4.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f45"].id,
			this.PLACES["placebox_sklad_f47"].id,
			this.PLACES["placebox_f45"].id,
			this.PLACES["placebox_f47"].id
		}

		gameState.dodikAssist5:setStockman(5, {				
			this.PLACES["placebox_sklad_for_f41"].id,
			this.PLACES["placebox_sklad_for_f46"].id
		})

		gameState.dodikAssist5.allowWorkPlaces = {
			this.PLACES["placebox_sklad_for_f41"].id,
			this.PLACES["placebox_sklad_for_f46"].id,
			this.PLACES["placebox_f40_1"].id,
			this.PLACES["placebox_f40_2"].id,
			this.PLACES["placebox_f40_3"].id,
			this.PLACES["placebox_f42_1"].id,
			this.PLACES["placebox_f42_2"].id,
			this.PLACES["placebox_f42_3"].id,
			this.PLACES["placebox_f42_4"].id
		}

		gameState.dodikAssist6:setStockman(6, {				
			this.PLACES["placebox_sklad_for_f45"].id,
			this.PLACES["placebox_sklad_for_f47"].id,
			this.PLACES["placebox_sklad_for_f47_2"].id
		})

		gameState.dodikAssist6.allowWorkPlaces = {
			this.PLACES["placebox_sklad_for_f45"].id,
			this.PLACES["placebox_sklad_for_f47"].id,
			this.PLACES["placebox_sklad_for_f47_2"].id,
			this.PLACES["placebox_f44_1"].id,
			this.PLACES["placebox_f44_2"].id,
			this.PLACES["placebox_f44_3"].id,
			this.PLACES["placebox_f44_4"].id,
			this.PLACES["placebox_f43_1"].id,
			this.PLACES["placebox_f43_2"].id,
			this.PLACES["placebox_f43_3"].id,
			this.PLACES["placebox_f43_4"].id,
			this.PLACES["placebox_f41"].id
		}

	end

	function this:updateDataMain()
		local listSalesMain = {
			"placebox_cashbox",
			"placebox_sklad_f40",
			"placebox_f40_1",
			"placebox_f40_2",
			"placebox_sklad_f44",
			"placebox_f44_1",
			"placebox_f44_2",
			"placebox_sklad_f43",
			"placebox_f43_1",
			"placebox_f43_2",
			"placebox_sklad_f42",
			"placebox_f42_1",
			"placebox_f42_2",
			"placebox_sklad_f45",
			"placebox_sklad_for_f45",
			"placebox_sklad_f46",
			"placebox_sklad_for_f46",
			"placebox_sklad_f47",
			"placebox_sklad_for_f47",
			"placebox_nextmart"
		}

		local listPlacesCamera = {
			"placebox_cashbox",
			"placebox_sklad_f40",
			"placebox_f40_2",
			"placebox_sklad_f44",
			"placebox_f44_2",
			"placebox_sklad_f43",
			"placebox_f43_2",
			"placebox_f42_2",
			"placebox_sklad_f45",
			"placebox_sklad_for_f45",
			"placebox_sklad_f46",
			"placebox_sklad_for_f46",
			"placebox_sklad_f47"
		}

		local listPlacesAim = {
			"placebox_aimM",
			"placebox_aim1",
			"placebox_aim2",
			"placebox_aim3",
			"placebox_aim4",
			"placebox_aim5",
			"placebox_aim6"
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

		if (global.numSale6 == 0) then
			
			global.numSale6 = 1
			global.amount_cashbox6 = datamanager.get_start_coins(6, this.listSalesMain, {2,3})
		end

		gameState.numSale		= global.numSale6
		gameState.amountCashBox	= global.amount_cashbox6
		gameState.defauiltSklad = "placebox_sklad_f40"
		gameState.funsquadSklads = {40,42,43,44}

		this.NUMPLACE_ZAVOD		= this.PLACES["placebox_sklad_for_f45"].id
		this.NUMPLACE_MIN		= this.PLACES["placebox_sklad_f40"].id

		this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]

		local dataSalesNum = datamanager.get_num_sale_values(6)
		this.NUM_SALE_CRAZY		= dataSalesNum[1]
		this.NUM_SALE_OFFER		= dataSalesNum[2]
		this.NUM_SALE_PARROT	= dataSalesNum[3]
		this.NUM_SALE_ZAVOD		= dataSalesNum[4]
		this.NUM_SALE_SKLAD_2	= dataSalesNum[5]

		this.listUpgradesId		= {
			0,
			this.PLACES["placebox_aim2"].id,
			this.PLACES["placebox_aim3"].id,
			this.PLACES["placebox_aim4"].id,
			this.PLACES["placebox_aim5"].id,
			this.PLACES["placebox_aim6"].id,
			this.PLACES["placebox_sklad_for_f41"].id,
			this.PLACES["placebox_sklad_for_f45"].id,
			this.PLACES["placebox_sklad_for_f46"].id,
			this.PLACES["placebox_sklad_for_f47"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f41"].id,this.PLACES["placebox_sklad_for_f41"].id},
			{this.PLACES["placebox_f45"].id,this.PLACES["placebox_sklad_for_f45"].id},
			{this.PLACES["placebox_f46"].id,this.PLACES["placebox_sklad_for_f46"].id},
			{this.PLACES["placebox_f47"].id,this.PLACES["placebox_sklad_for_f47"].id,this.PLACES["placebox_sklad_for_f47_2"].id},
		}

		this.tilesZavod = {
			water_zavod					= vmath.vector3(16,20,0),
			coconut_zavod				= vmath.vector3(24,21,0),
			ice_zavod					= vmath.vector3(25,16,0),
			mango_zavod					= vmath.vector3(16,3,0),
			lemon_zavod					= vmath.vector3(22,4,0),
			mango_ice_cream_zavod 		= vmath.vector3(9,6,0),
			coconut_juice_zavod			= vmath.vector3(34,19,0),
			lemonade_zavod				= vmath.vector3(33,10,0),
			ice_zavod_chef				= vmath.vector3(22,18,0),
			mango_ice_cream_zavod_chef	= vmath.vector3(6,6,0),
			coconut_juice_zavod_chef	= vmath.vector3(31,19,0),
			lemonade_zavod_chef1		= vmath.vector3(28,11,0),
			lemonade_zavod_chef2		= vmath.vector3(30,11,0)
		}

	end

	function this:updateAlertPlaces()
		this.placesAlert['ice']				= 'ice_appliance'
		this.placesAlert['coconut_juice']	= 'coconut_juice_appliance'
		this.placesAlert['mango_ice_cream']	= 'mango_ice_cream_appliance'
		this.placesAlert['lemonade']		= 'lemonade_appliance'
		this.placesAlert['id_a2']	= 'relax_place2'
		this.placesAlert['id_a3']	= 'relax_place3'
		this.placesAlert['id_a4']	= 'relax_place4'
		this.placesAlert['id_a5']	= 'relax_place5'
		this.placesAlert['id_a6']	= 'relax_place6'

	end

	function this:updateNumSale(vNumSale)
		global.numSale6 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox6 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level6
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price6
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max6
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4,5,6}
		elseif (vType == 'list_id_zavods') then
			return {7,8,9,10}
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
			spriteName = "icon_assistant2"
		elseif vId == this.PLACES["placebox_aim5"].id then
			spriteName = "icon_chef2"
		elseif vId == this.PLACES["placebox_aim6"].id then
			spriteName = "icon_chef2"
		end

		return spriteName

	end

	

	function this:initUpgrades()
		this.countUpgrades = #this.listUpgradesId

	end

	function this:getIndexUpgradeView(vIndex)
		local indexes = {1,2,3,4,5,6,7,8,9,10}
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
		elseif vNum == 6 then
			player = gameState.dodikAssist6
		end

		return player
	end

	function this:getUpgradeZavod(vNum)
		local value1 = 0
		local value2 = 0
		local value3 = 0

		if vNum == 7 then
			value1	= this.placesUpgrade[1][1]
			value2	= this.placesUpgrade[1][2]
		elseif vNum == 8 then
			value1	= this.placesUpgrade[2][1]
			value2	= this.placesUpgrade[2][2]
		elseif vNum == 9 then
			value1	= this.placesUpgrade[3][1]
			value2	= this.placesUpgrade[3][2]
		elseif vNum == 10 then
			value1	= this.placesUpgrade[4][1]
			value2	= this.placesUpgrade[4][2]
			value3	= this.placesUpgrade[4][3]
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
		local offsetPlace = vmath.vector3(0,0,0)
		local isSkladPlace = false
		local isExitPlace = false

		

		if vNamePlace == 'ice' then
			offsetPlace.y = 50
		elseif vNamePlace == 'mango' then
			offsetPlace.y = 50
		elseif vNamePlace == 'lemonade' then
			offsetPlace.y = 50
		end

		
		
		local placePos = nil

		for k,v in pairs(this.dataWarehouse) do
			if (vNamePlace == v.name) then
				isSkladPlace = true
				num = this.PLACES[v.link].id
				placePos = this.PLACES[v.link].pos
				tile = gameState:getTileFromPos(placePos.x + v.offset.x + offsetPlace.x, placePos.y + v.offset.y + offsetPlace.y)
				break
			end
		end

		
		
		
		

		if vNamePlace == 'basket' then
			tile = gameState:getTileFromPos(this.posBasket.x, this.posBasket.y - 40)
		elseif vNamePlace == 'cashier' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x - 150, placePos.y)
		elseif vNamePlace == 'cashbox' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x + 200, placePos.y + 100)
			isSkladPlace = true
			num = this.PLACES["placebox_cashbox"].id

		elseif vNamePlace == 'exit' then
			tile = gameState:getTileFromPos(this.posStart.x, this.posStart.y)
			isExitPlace = true

		elseif vNamePlace == 'dancefloor' then
			tile = gameState:getTileFromPos(this.posDancefloor.x, this.posDancefloor.y)

		elseif vNamePlace == 'trash' then
			tile = gameState:getTileFromPos(this.posTrash.x, this.posTrash.y - 40)
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

		elseif vNamePlace == 'relax_place5' then
			local placePos = this.PLACES["placebox_aim5"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'relax_place6' then
			local placePos = this.PLACES["placebox_aim6"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		
		elseif vNamePlace == 'ice_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f41"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'coconut_juice_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f45"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'mango_ice_cream_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f46"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'lemonade_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f47"].pos
			tile = gameState:getTileFromPos(placePos.x - 40, placePos.y - 120)
			
			

		end

		
		if (this.tilesZavod[vNamePlace]) then
			tile = this.tilesZavod[vNamePlace]
		end

		if (tile.x == 0) and (tile.y == 0) then
			lume.trace('[ WARNING ] not found tile for',vNamePlace)
			lume.trace(vNamePlace, tile, num, isSkladPlace, isExitPlace)
		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_f40_1"].isActive) then
			num = this.PLACES["placebox_sklad_f40"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f41"].isActive) then
			num = this.PLACES["placebox_sklad_f41"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f42_1"].isActive) then
			num = this.PLACES["placebox_sklad_f42"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f43_1"].isActive) then
			num = this.PLACES["placebox_sklad_f43"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f44_1"].isActive) then
			num = this.PLACES["placebox_sklad_f44"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f45"].isActive) then
			num = this.PLACES["placebox_sklad_f45"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f46"].isActive) then
			num = this.PLACES["placebox_sklad_f46"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f47"].isActive) then
			num = this.PLACES["placebox_sklad_f47"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f41"].id then
			countFood1 = this.PLACES["placebox_f41"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f41"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f45"].id then
			countFood1 = this.PLACES["placebox_f45"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f45"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f46"].id then
			countFood1 = this.PLACES["placebox_f46"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f46"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f47"].id then
			countFood1 = this.PLACES["placebox_f47"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f47"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f47_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		
		elseif vId == this.PLACES["placebox_sklad_for_f47_2"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f41"].countFood
			countFood2 = this.PLACES["placebox_f41"].countFood

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

		if (this.PLACES["placebox_f40_1"].isActive) then
			table.insert(typesFood, 40)
		end
		if (this.PLACES["placebox_sklad_for_f41"].isActive) then
			table.insert(typesFood, 41)
		end
		if (this.PLACES["placebox_f42_1"].isActive) then
			table.insert(typesFood, 42)
		end
		if (this.PLACES["placebox_f43_1"].isActive) then
			table.insert(typesFood, 43)
		end
		if (this.PLACES["placebox_f44_1"].isActive) then
			table.insert(typesFood, 44)
		end
		if (this.PLACES["placebox_sklad_for_f45"].isActive) then
			table.insert(typesFood, 45)
		end
		if (this.PLACES["placebox_sklad_for_f46"].isActive) then
			table.insert(typesFood, 46)
		end
		if (this.PLACES["placebox_sklad_for_f47"].isActive) then
			table.insert(typesFood, 47)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f40"].id then
			wishFood.type = this.PLACES["placebox_sklad_f40"].typeFood
			wishFood.offsetY = 110
			wishFood.places_id = {
				this.PLACES["placebox_f40_1"].id,
				this.PLACES["placebox_f40_2"].id,
				this.PLACES["placebox_f40_3"].id
			}
			wishFood.skladName = global.foodName[40]
			wishFood.zavodName = 'water_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f44"].id then
			wishFood.type = this.PLACES["placebox_sklad_f44"].typeFood
			wishFood.offsetY = 55
			wishFood.places_id = {
				this.PLACES["placebox_f44_1"].id,
				this.PLACES["placebox_f44_2"].id,
				this.PLACES["placebox_f44_3"].id,
				this.PLACES["placebox_f44_4"].id
			}
			wishFood.skladName = global.foodName[44]
			wishFood.zavodName = 'coconut_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f41"].id then
			wishFood.type = this.PLACES["placebox_sklad_f41"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f41"].id}
			wishFood.skladName = global.foodName[41]
			wishFood.zavodName = 'ice_zavod'
		
		
		elseif vPlaceId == this.PLACES["placebox_sklad_f42"].id then
			wishFood.type = this.PLACES["placebox_sklad_f42"].typeFood
			wishFood.offsetY = 60
			wishFood.places_id = {
				this.PLACES["placebox_f42_1"].id,
				this.PLACES["placebox_f42_2"].id,
				this.PLACES["placebox_f42_3"].id,
				this.PLACES["placebox_f42_4"].id
			}
			wishFood.skladName = global.foodName[42]
			wishFood.zavodName = 'mango_zavod'
			
		elseif vPlaceId == this.PLACES["placebox_sklad_f43"].id then
			wishFood.type = this.PLACES["placebox_sklad_f43"].typeFood
			wishFood.offsetY = 60
			wishFood.places_id = {
				this.PLACES["placebox_f43_1"].id,
				this.PLACES["placebox_f43_2"].id,
				this.PLACES["placebox_f43_3"].id,
				this.PLACES["placebox_f43_4"].id
			}
			wishFood.skladName = global.foodName[43]
			wishFood.zavodName = 'lemon_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f46"].id then
			wishFood.type = this.PLACES["placebox_sklad_f46"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f46"].id}
			wishFood.skladName = global.foodName[46]
			wishFood.zavodName = 'mango_ice_cream_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f45"].id then
			wishFood.type = this.PLACES["placebox_sklad_f45"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f45"].id}
			wishFood.skladName = global.foodName[45]
			wishFood.zavodName = 'coconut_juice_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f47"].id then
			wishFood.type = this.PLACES["placebox_sklad_f47"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f47"].id}
			wishFood.skladName = global.foodName[47]
			wishFood.zavodName = 'lemonade_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f41"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f41"].typeFood
			wishFood.offsetY = 110
			wishFood.places_id = {
				this.PLACES["placebox_f40_1"].id,
				this.PLACES["placebox_f40_2"].id,
				this.PLACES["placebox_f40_3"].id
			}
			wishFood.skladName = 'ice_zavod_chef'
			wishFood.zavodName = 'water_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f46"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f46"].typeFood
			wishFood.offsetY = 60
			wishFood.places_id = {
				this.PLACES["placebox_f42_1"].id,
				this.PLACES["placebox_f42_2"].id,
				this.PLACES["placebox_f42_3"].id,
				this.PLACES["placebox_f42_4"].id
			}
			wishFood.skladName = 'mango_ice_cream_zavod_chef'
			wishFood.zavodName = 'mango_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f45"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f45"].typeFood
			wishFood.offsetY = 55
			wishFood.places_id = {
				this.PLACES["placebox_f44_1"].id,
				this.PLACES["placebox_f44_2"].id,
				this.PLACES["placebox_f44_3"].id,
				this.PLACES["placebox_f44_4"].id
			}
			wishFood.skladName = 'coconut_juice_zavod_chef'
			wishFood.zavodName = 'coconut_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f47"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f47"].typeFood
			wishFood.offsetY = 60
			wishFood.places_id = {
				this.PLACES["placebox_f43_1"].id,
				this.PLACES["placebox_f43_2"].id,
				this.PLACES["placebox_f43_3"].id,
				this.PLACES["placebox_f43_4"].id
			}
			wishFood.skladName = 'lemonade_zavod_chef1'
			wishFood.zavodName = 'lemon_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f47_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f47_2"].typeFood
			wishFood.offsetY = 90
			wishFood.places_id = {this.PLACES["placebox_f41"].id}
			wishFood.skladName = 'lemonade_zavod_chef2'
			wishFood.zavodName = 'ice_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_f40_2"].id then
			table.insert(listNum, "placebox_f40_3")
			table.insert(listNum, "placebox_aim1")

		elseif vPrevPlaceId == this.PLACES["placebox_f42_2"].id then
			table.insert(listNum, "placebox_f42_3")
			table.insert(listNum, "placebox_aim3")

		elseif vPrevPlaceId == this.PLACES["placebox_f42_3"].id then
			table.insert(listNum, "placebox_f42_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f43_2"].id then
			table.insert(listNum, "placebox_f43_3")

		elseif vPrevPlaceId == this.PLACES["placebox_f43_3"].id then
			table.insert(listNum, "placebox_f43_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f44_2"].id then
			table.insert(listNum, "placebox_f44_3")
			table.insert(listNum, "placebox_sklad_f41")
			table.insert(listNum, "placebox_aim2")

		elseif vPrevPlaceId == this.PLACES["placebox_f44_3"].id then
			table.insert(listNum, "placebox_f44_4")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_f41"].id then
			table.insert(listNum, "placebox_sklad_for_f41")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f46"].id then
			table.insert(listNum, "placebox_aim5")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f47"].id then
			table.insert(listNum, "placebox_aim4")
			table.insert(listNum, "placebox_aim6")

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

			elseif vBoxId == this.PLACES["placebox_aim3"].id then
				gameState.dodikAssist3:updateVisible(true)
				gameState.dodikAssist3:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_aim4"].id then
				gameState.dodikAssist4:updateVisible(true)
				gameState.dodikAssist4:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_aim5"].id then
				gameState.dodikAssist5:updateVisible(true)
				gameState.dodikAssist5:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_aim6"].id then
				gameState.dodikAssist6:updateVisible(true)
				gameState.dodikAssist6:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_sklad_f42"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_sklad_f41"].id then
				this.NUMPLACE_ZAVOD = this.PLACES["placebox_sklad_for_f41"].id

				if (not vIsFromSave) then
					gameState:followCameraPlace(this.PLACES["placebox_sklad_for_f41"].id)
				end

			elseif vBoxId == this.PLACES["placebox_f40_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

				msg.post(this.PLACES["placebox_f40_1"].tazik, "enable")
			
			elseif vBoxId == this.PLACES["placebox_f40_2"].id then
				msg.post(this.PLACES["placebox_f40_2"].tazik, "enable")

			elseif vBoxId == this.PLACES["placebox_f40_3"].id then
				msg.post(this.PLACES["placebox_f40_3"].tazik, "enable")

			elseif vBoxId == this.PLACES["placebox_f44_1"].id then
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

			elseif vBoxId == this.PLACES["placebox_f43_1"].id then
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_f42_1"].id then
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f41"].id then
				gameState:setZavodView(vBoxId, "placebox_f41", "applause")

			elseif vBoxId == this.PLACES["placebox_sklad_for_f45"].id then
				gameState:setZavodView(vBoxId, "placebox_f45", "applause")
				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f46"].id then
				gameState:setZavodView(vBoxId, "placebox_f46", "applause")
				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f47"].id then
				gameState:setZavodView(vBoxId, "placebox_f47", "applause", "placebox_sklad_for_f47_2")

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
		p.x = this.posExit.x - 9*r
		p.y = this.posExit.y - 20*r

		return p
	end

	function this:addZavodViews()
		this.PLACES["placebox_f41"].linkSklad = this.PLACES["placebox_sklad_for_f41"].id
		this.PLACES["placebox_f45"].linkSklad = this.PLACES["placebox_sklad_for_f45"].id
		this.PLACES["placebox_f46"].linkSklad = this.PLACES["placebox_sklad_for_f46"].id
		this.PLACES["placebox_f47"].linkSklad = this.PLACES["placebox_sklad_for_f47"].id
		this.PLACES["placebox_f47"].linkSklad2 = this.PLACES["placebox_sklad_for_f47_2"].id

		gameState:addZavodObject('ice',				this.PLACES["placebox_f41"].id, this.PLACES["placebox_sklad_for_f41"].id)
		gameState:addZavodObject('coconut_juice',	this.PLACES["placebox_f45"].id, this.PLACES["placebox_sklad_for_f45"].id)
		gameState:addZavodObject('mango_ice_cream',	this.PLACES["placebox_f46"].id, this.PLACES["placebox_sklad_for_f46"].id)
		gameState:addZavodObject('lemonade',		this.PLACES["placebox_f47"].id, this.PLACES["placebox_sklad_for_f47"].id, this.PLACES["placebox_sklad_for_f47_2"].id)

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f41"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f45"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f46"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f47"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateZavodDecor("zavod_simple",	"placebox_sklad_for_f41", "placebox_f41", "ice_maker1", vmath.vector3(-2,3,0))
		gameState:updateZavodDecor("zavod_simple",	"placebox_sklad_for_f45", "placebox_f45", "coconut_juice_maker1", vmath.vector3(-10,24,0))
		gameState:updateZavodDecor("zavod_simple",	"placebox_sklad_for_f46", "placebox_f46", "mango_ice_cream_maker1", vmath.vector3(3,-7,0))
		gameState:updateZavodDecor("zavod_big2",	"placebox_sklad_for_f47", "placebox_f47", "lemonade_maker1", vmath.vector3(59,3-30,0), 55+30)

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		gameState:addDecorObject('gate1_up', vmath.vector3(this.posGateExit.x-6,this.posGateExit.y-45,0), 130+45)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x-102,this.posGateExit.y-8,0), 50)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x+111,this.posGateExit.y-41,0), 50)

		gameState:addDecorObject('billboard1', vmath.vector3(1040,760,0), 110)

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
