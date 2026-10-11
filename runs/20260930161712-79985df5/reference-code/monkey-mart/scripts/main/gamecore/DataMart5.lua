DataMart5 = {}

function DataMart5:init()
	local this = {}

    this.posDodik      		= {x = -150, y = 605}			
    
    
	
	

	this.limitMoveX 		= {min = -1500, max = 1500}
    this.limitMoveY 		= {min = -1100, max = 1100}

	this.posExit   			= vmath.vector3(-170, 720+200, 0)
	this.posStart   		= vmath.vector3(-170, 720, 0)
	this.posDancefloor		= vmath.vector3(-140, 450, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(-174, 736, 0)
	this.posManager   		= vmath.vector3(-590-15, 635-15, 0)
	this.posParrot   		= vmath.vector3(-155, 160, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(-70, 610, 0)

	this.posTrash      		= {frame='trash1', x = -357, y = 696, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = 50, y = 600, radius = 10, offsetY = 35}

	this.placesCamera		= {}
	this.placesAlert		= {}

	this.listSalesMain		= {}
	this.aimPlaces			= {}
	this.NUMPLACE_LAST		= 1
	this.NUMPLACE_ZAVOD		= 0				
	this.NUMPLACE_MIN		= 0				

	this.typeFoodParrot		= 35

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

	this.pricePlaces		= global.pricePlaces5
    this.have_places		= global.have_places5

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
								offsetBuy	= vmath.vector3(-320,-30,0),
								radius		= 3000,
								paid		= 0,
								isActive	= false,
								isPhysics	= true
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
								link		= "placebox_aim7",
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                radius		= 3000,
                                paid		= 0,
                                isActive	= false,
                                isHideSprite= true
                            },
							{
								link		= "placebox_f35_1",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 35,
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
								link		= "placebox_f35_2",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 35,
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
								link		= "placebox_f35_3",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 35,
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
								link		= "placebox_f35_4",
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(4,-50,0),
								typeFood	= 35,
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
								link		= "placebox_sklad_for_f3",
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(-30,-10,0),
								typeFood	= 15,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 12000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= false,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f3",
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(-20,-120,0),
								typeFood	= 3,
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
								linkSklad	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_for_f36",
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(-30,-10,0),
								typeFood	= 35,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 12000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= false,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f36",
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(-20,-120,0),
								typeFood	= 36,
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
								linkSklad	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_1",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_2",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_3",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_4",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_5",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f15_6",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(7,-15,0),
								typeFood	= 15,
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
								callCollect	= gameState.collectTwoFood,
								updateZavod	= gameState.updateZavod
							},
							{
							    link		= "placebox_sklad_f15",
							    typeFood	= 15,
							    typeSklad	= 'sklad_palet_15',
							    iconFrame	= 'sklad_wheat1',
								offsetIcon  = vmath.vector3(3,-2,0),
								offsetWork	= vmath.vector3(-20,-100,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f3",
								offsetY		= 20,
								typeFood	= 3,
								typeSklad	= 'sklad_eggs',
								iconFrame	= nil,
								offsetIcon  = vmath.vector3(0,0,0),
								offsetWork	= vmath.vector3(-10,-90,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
                                link		= "placebox_sklad_f18",
								offsetY		= 45,
                                typeFood	= 18,
								typeSklad	= 'sklad_3_polki',
								iconFrame	= 'sklad_flour1',
								offsetIcon  = vmath.vector3(0,0,0),
								offsetWork	= vmath.vector3(-10,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
                            },
							{
								link		= "placebox_sklad_f35",
								typeFood	= 35,
								typeSklad	= 'sklad_palet_15',
								iconFrame	= 'sklad_apple1',
								offsetIcon  = vmath.vector3(0,-2,0),
								offsetWork	= vmath.vector3(-20,-100,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f36",
								typeFood	= 36,
								typeSklad	= 'sklad_2_paleta',
								iconFrame	= 'sklad_sausage1',
								offsetIcon  = vmath.vector3(2,4,0),
								offsetWork	= vmath.vector3(-20,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f37",
								offsetY		= 35,
								typeFood	= 37,
								typeSklad	= 'sklad_3_stupeni',
								iconFrame	= 'sklad_bread1',
								offsetIcon  = vmath.vector3(0,1,0),
								offsetWork	= vmath.vector3(10,-105,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f38",
								typeFood	= 38,
								typeSklad	= 'sklad_2_paleta',
								iconFrame	= 'sklad_hotdog1',
								offsetIcon  = vmath.vector3(2,3,0),
								offsetWork	= vmath.vector3(-20,-80,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							{
								link		= "placebox_sklad_f39",
								typeFood	= 39,
								typeSklad	= 'sklad_brevna',
								iconFrame	= 'sklad_apple_juice1',
								offsetIcon  = vmath.vector3(0,2,0),
								offsetWork	= vmath.vector3(-20,-100,0),
								isActive	= false,
								isPhysics	= true,
								isWarehouse	= true
							},
							
							{
								link		= "placebox_f18",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 18,
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
								link		= "placebox_sklad_for_f18",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-115,35,0),
								typeFood	= 15,
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
								link		= "placebox_f37",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-55,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 37,
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
								link		= "placebox_sklad_for_f37",
								offsetY		= -80,
								offsetWork	= vmath.vector3(-30,-70,0),
								offsetBuy	= vmath.vector3(130,-30,0),
								offsetPlaha	= vmath.vector3(-15,-160,0),
								offsetSklad	= vmath.vector3(-43,-68,0),
								offsetBoost	= vmath.vector3(0,-5,0),
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
								link		= "placebox_sklad_for_f38",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,30,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-175,45,0),
								offsetPlaha	= vmath.vector3(-60,10,0),
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
								link		= "placebox_sklad_for_f38_2",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-15,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(0,-7,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								typeFood	= 36,
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
								link		= "placebox_f38",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-5,-25,0),
								offsetBoost	= vmath.vector3(60,-10,0),
								typeFood	= 38,
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
							},
							
							{
								link		= "placebox_f39",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetBoost	= vmath.vector3(0,-10,0),
								typeFood	= 39,
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
								link		= "placebox_sklad_for_f39",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-114,41,0),
								typeFood	= 35,
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
							
                        }

	

	this.map_width	= 30
	this.map_height	= 23

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,2,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,2,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						2,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,2,2,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,2,2,2,2,2,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,5,5,5,5,5,1,1,1,0,0,1,0,0,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,5,1,1,5,5,5,5,5,5,1,1,1,1,1,
						1,1,1,1,1,2,2,1,1,1,1,1,5,1,1,1,5,1,1,0,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,2,1,1,1,1,1,5,5,5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,1,1,1,2,2,2,2,2,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,0,1,0,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {486,487,516,517,547}
		elseif vNumPlaceBox == 25 then
			 indexes = {317,318,319,347,348,349}
		elseif vNumPlaceBox == 26 then
			 indexes = {343,344,373,374}
		elseif vNumPlaceBox == 27 then
			indexes = {222,223,224,252}
		elseif vNumPlaceBox == 28 then
			indexes = {586,587,588,617,618}
		elseif vNumPlaceBox == 29 then
			indexes = {592,593,594,595,596}
		elseif vNumPlaceBox == 30 then
			indexes = {271,272,273,301,302}
		elseif vNumPlaceBox == 31 then
			indexes = {246,247,248,249,276}
		elseif vNumPlaceBox == 32 then
			indexes = {369,370,371,399,400,401}
		elseif vNumPlaceBox == 34 then
			indexes = {73,74,75,76,77,103,104,105,106}
		elseif vNumPlaceBox == 36 then
			indexes = {66,96,97,126,127,157}
		elseif vNumPlaceBox == 37 then
			indexes = {169,170,171,172,173,174,199,200,201}
		elseif vNumPlaceBox == 41 then
			indexes = {392,393,394,395,396}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikManager:updateHat(5)
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)
		gameState.dodikAssist3:updateHat(1)
		gameState.dodikAssist4:updateHat(1)
		gameState.dodikAssist5:updateHat(3)
		gameState.dodikAssist6:updateHat(4)
		gameState.dodikAssist7:updateHat(4)

		gameState.dodikAssist2:setOptions({maxFood = 3})	
		gameState.dodikAssist3:setOptions({maxFood = 3})	
		gameState.dodikAssist4:setOptions({maxFood = 3})	
		gameState.dodikAssist5:setOptions({maxFood = 3})	
		gameState.dodikAssist6:setOptions({maxFood = 3})	
		gameState.dodikAssist7:setOptions({maxFood = 3})	

		
		gameState.dodikAssist2:setStockman(2, {
			this.PLACES["placebox_sklad_f35"].id,
			this.PLACES["placebox_sklad_f36"].id,
			this.PLACES["placebox_sklad_f3"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f35"].id,
			this.PLACES["placebox_sklad_f36"].id,
			this.PLACES["placebox_sklad_f3"].id,
			this.PLACES["placebox_f35_1"].id,
			this.PLACES["placebox_f35_2"].id,
			this.PLACES["placebox_f35_3"].id,
			this.PLACES["placebox_f35_4"].id,
			this.PLACES["placebox_f36"].id,
			this.PLACES["placebox_f3"].id
		}

		gameState.dodikAssist3:setStockman(3, {				
			this.PLACES["placebox_sklad_f15"].id,
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f38"].id
		})
		gameState.dodikAssist3.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f15"].id,
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f38"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f38"].id
		}

		gameState.dodikAssist4:setStockman(4, {				
			this.PLACES["placebox_sklad_f37"].id,
			this.PLACES["placebox_sklad_f39"].id
		})
		gameState.dodikAssist4.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f37"].id,
			this.PLACES["placebox_sklad_f39"].id,
			this.PLACES["placebox_f37"].id,
			this.PLACES["placebox_f39"].id
		}

		gameState.dodikAssist5:setStockman(5, {				
			this.PLACES["placebox_sklad_for_f36"].id,
			this.PLACES["placebox_sklad_for_f3"].id
		})
		gameState.dodikAssist5.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f36"].id,
			this.PLACES["placebox_sklad_for_f3"].id,
			this.PLACES["placebox_f35_1"].id,
			this.PLACES["placebox_f35_2"].id,
			this.PLACES["placebox_f35_3"].id,
			this.PLACES["placebox_f35_4"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id
		}

		gameState.dodikAssist6:setStockman(6, {				
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f38_2"].id,
			this.PLACES["placebox_sklad_for_f38"].id
		})
		gameState.dodikAssist6.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f38"].id,
			this.PLACES["placebox_sklad_for_f38_2"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f36"].id
		}

		gameState.dodikAssist7:setStockman(7, {				
			this.PLACES["placebox_sklad_for_f37"].id,
			this.PLACES["placebox_sklad_for_f39"].id
		})
		gameState.dodikAssist7.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f37"].id,
			this.PLACES["placebox_sklad_for_f39"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f35_1"].id,
			this.PLACES["placebox_f35_2"].id,
			this.PLACES["placebox_f35_3"].id,
			this.PLACES["placebox_f35_4"].id
		}

	end

	function this:updateDataMain()
		local listSalesMain = {
			"placebox_cashbox",
			"placebox_sklad_f35",
			"placebox_f35_1",
			"placebox_f35_2",
			"placebox_sklad_f36",
			"placebox_f36",
			"placebox_sklad_f15",
			"placebox_f15_1",
			"placebox_f15_2",
			"placebox_sklad_f3",
			"placebox_f3",
			"placebox_sklad_f18",
			"placebox_sklad_for_f18",
			"placebox_sklad_f37",
			"placebox_sklad_for_f37",
			"placebox_sklad_f39",
			"placebox_sklad_for_f39",
			"placebox_sklad_f38",
			"placebox_sklad_for_f38",
			"placebox_nextmart"
		}

		local listPlacesCamera = {
			"placebox_cashbox",
			"placebox_f35_2",
			"placebox_sklad_f36",
			"placebox_f36",
			"placebox_sklad_f15",
			"placebox_f15_2",
			"placebox_sklad_f3",
			"placebox_f3",
			"placebox_sklad_f18",
			"placebox_sklad_for_f18",
			"placebox_sklad_f37",
			"placebox_sklad_for_f37",
			"placebox_sklad_f39",
			"placebox_sklad_for_f39",
			"placebox_sklad_f38"
		}

		local listPlacesAim = {
			"placebox_aimM",
			"placebox_aim1",
			"placebox_aim2",
			"placebox_aim3",
			"placebox_aim4",
			"placebox_aim5",
			"placebox_aim6",
			"placebox_aim7"
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

		if (global.numSale5 == 0) then
			
			global.numSale5 = 1
			global.amount_cashbox5 = datamanager.get_start_coins(5, this.listSalesMain, {2,3})
		end

		

		gameState.numSale		= global.numSale5
		gameState.amountCashBox	= global.amount_cashbox5
		gameState.defauiltSklad = "placebox_sklad_f35"
		gameState.funsquadSklads = {35,15,3,36}

		this.NUMPLACE_ZAVOD		= this.PLACES["placebox_sklad_for_f36"].id
		this.NUMPLACE_MIN		= this.PLACES["placebox_sklad_f15"].id

		this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]

		local dataSalesNum = datamanager.get_num_sale_values(5)
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
			this.PLACES["placebox_aim7"].id,
			this.PLACES["placebox_sklad_for_f3"].id,
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f36"].id,
			this.PLACES["placebox_sklad_for_f37"].id,
			this.PLACES["placebox_sklad_for_f38"].id,
			this.PLACES["placebox_sklad_for_f39"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f3"].id,this.PLACES["placebox_sklad_for_f3"].id},
			{this.PLACES["placebox_f18"].id,this.PLACES["placebox_sklad_for_f18"].id},
			{this.PLACES["placebox_f36"].id,this.PLACES["placebox_sklad_for_f36"].id},
			{this.PLACES["placebox_f37"].id,this.PLACES["placebox_sklad_for_f37"].id},
			{this.PLACES["placebox_f38"].id,this.PLACES["placebox_sklad_for_f38"].id,this.PLACES["placebox_sklad_for_f38_2"].id},
			{this.PLACES["placebox_f39"].id,this.PLACES["placebox_sklad_for_f39"].id}
		}

	end

	function this:updateAlertPlaces()
		this.placesAlert['chicken'] = 'chicken_animal'
		this.placesAlert['pig'] 	= 'pig_animal'

		this.placesAlert['flour']		= 'flour_appliance'
		this.placesAlert['bread']		= 'bread_appliance'
		this.placesAlert['hotdog']		= 'hotdog_appliance'
		this.placesAlert['apple_juice']	= 'apple_juice_appliance'

		this.placesAlert['id_a2']	= 'relax_place2'
		this.placesAlert['id_a3']	= 'relax_place3'
		this.placesAlert['id_a4']	= 'relax_place4'
		this.placesAlert['id_a5']	= 'relax_place5'
		this.placesAlert['id_a6']	= 'relax_place6'
		this.placesAlert['id_a7']	= 'relax_place7'

	end

	function this:updateNumSale(vNumSale)
		global.numSale5 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox5 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level5
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price5
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max5
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4,5,6,7}
		elseif (vType == 'list_id_zavods') then
			return {8,9,10,11,12,13}
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
			spriteName = "icon_farmer2"
		elseif vId == this.PLACES["placebox_aim6"].id then
			spriteName = "icon_chef2"
		elseif vId == this.PLACES["placebox_aim7"].id then
			spriteName = "icon_chef2"
		end

		return spriteName

	end

	

	function this:initUpgrades()
		this.countUpgrades = #this.listUpgradesId

	end

	function this:getIndexUpgradeView(vIndex)
		local indexes = {1,2,3,4,5,6,7,9,10,8,11,12,13}
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
		elseif vNum == 7 then
			player = gameState.dodikAssist7
		end

		return player
	end

	function this:getUpgradeZavod(vNum)
		local value1 = 0
		local value2 = 0
		local value3 = 0

		if vNum == 8 then
			value1	= this.placesUpgrade[1][1]
			value2	= this.placesUpgrade[1][2]
		elseif vNum == 9 then
			value1	= this.placesUpgrade[2][1]
			value2	= this.placesUpgrade[2][2]
		elseif vNum == 10 then
			value1	= this.placesUpgrade[3][1]
			value2	= this.placesUpgrade[3][2]
		elseif vNum == 11 then
			value1	= this.placesUpgrade[4][1]
			value2	= this.placesUpgrade[4][2]
		elseif vNum == 12 then
			value1	= this.placesUpgrade[5][1]
			value2	= this.placesUpgrade[5][2]
			value3	= this.placesUpgrade[5][3]
		elseif vNum == 13 then
			value1	= this.placesUpgrade[6][1]
			value2	= this.placesUpgrade[6][2]
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

		

		if vNamePlace == 'egg' then
			offsetPlace.x = -50
			offsetPlace.y = 50
		elseif vNamePlace == 'hotdog' then
			offsetPlace.x = -50
		elseif vNamePlace == 'apple_juice' then
			offsetPlace.y = 40
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
			tile = gameState:getTileFromPos(placePos.x + 150, placePos.y + 100)
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

		elseif vNamePlace == 'relax_place7' then
			local placePos = this.PLACES["placebox_aim7"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'apple_zavod' then
			tile = vmath.vector3(13,17,0)

		elseif vNamePlace == 'sausage_zavod' then
			tile = vmath.vector3(18,15,0)

		elseif vNamePlace == 'wheat_zavod' then
			tile = vmath.vector3(23,12,0)

		elseif vNamePlace == 'egg_zavod' then
			tile = vmath.vector3(22,14,0)

		elseif vNamePlace == 'flour_zavod' then
			tile = vmath.vector3(14,1,0)

		elseif vNamePlace == 'hotdog_zavod' then
			tile = vmath.vector3(21,4,0)

		elseif vNamePlace == 'bread_zavod' then
			tile = vmath.vector3(7,4,0)

		elseif vNamePlace == 'apple_juice_zavod' then
			tile = vmath.vector3(4,12,0)

		elseif vNamePlace == 'apple_pig' then
			tile = vmath.vector3(20,13,0)

		elseif vNamePlace == 'wheat_chicken' then
			tile = vmath.vector3(23,13,0)

		elseif vNamePlace == 'flour_zavod_chef' then
			tile = vmath.vector3(11,3,0)

		elseif vNamePlace == 'bread_zavod_chef' then
			tile = vmath.vector3(6,2,0)

		elseif vNamePlace == 'hotdog_zavod_chef1' then
			tile = vmath.vector3(17,5,0)

		elseif vNamePlace == 'hotdog_zavod_chef2' then
			tile = vmath.vector3(19,4,0)

		elseif vNamePlace == 'apple_juice_zavod_chef' then
			tile = vmath.vector3(1,12,0)

		
		elseif vNamePlace == 'chicken_animal' then
			tile = vmath.vector3(24,15,0)

		elseif vNamePlace == 'pig_animal' then
			local placePos = this.PLACES["placebox_sklad_for_f36"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y + 80)

		
		elseif vNamePlace == 'flour_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f18"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'bread_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f37"].pos
			tile = gameState:getTileFromPos(placePos.x + 80, placePos.y - 40)

		elseif vNamePlace == 'hotdog_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f38"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'apple_juice_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f39"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		end

		if (tile.x == 0) and (tile.y == 0) then
			lume.trace('[ WARNING ] not found tile for',vNamePlace)
			lume.trace(vNamePlace, tile, num, isSkladPlace, isExitPlace)
		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_f35_1"].isActive) then
			num = this.PLACES["placebox_sklad_f35"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f36"].isActive) then
			num = this.PLACES["placebox_sklad_f36"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f37"].isActive) then
			num = this.PLACES["placebox_sklad_f37"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f38"].isActive) then
			num = this.PLACES["placebox_sklad_f38"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f39"].isActive) then
			num = this.PLACES["placebox_sklad_f39"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f3"].isActive) then
			num = this.PLACES["placebox_sklad_f3"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f15_1"].isActive) then
			num = this.PLACES["placebox_sklad_f15"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f18"].isActive) then
			num = this.PLACES["placebox_sklad_f18"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f3"].id then
			countFood1 = this.PLACES["placebox_f3"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f3"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f18"].id then
			countFood1 = this.PLACES["placebox_f18"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f18"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f36"].id then
			countFood1 = this.PLACES["placebox_f36"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f36"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f37"].id then
			countFood1 = this.PLACES["placebox_f37"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f37"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f38"].id then
			countFood1 = this.PLACES["placebox_f38"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f38"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f38_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f39"].id then
			countFood1 = this.PLACES["placebox_f39"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f39"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		
		elseif vId == this.PLACES["placebox_sklad_for_f37"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f18"].countFood
			countFood2 = this.PLACES["placebox_f18"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_for_f38"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f18"].countFood
			countFood2 = this.PLACES["placebox_f18"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_for_f38_2"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f36"].countFood
			countFood2 = this.PLACES["placebox_f36"].countFood

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

		if (this.PLACES["placebox_sklad_for_f3"].isActive) then
			table.insert(typesFood, 3)
		end
		if (this.PLACES["placebox_f15_1"].isActive) then
			table.insert(typesFood, 15)
		end
		if (this.PLACES["placebox_sklad_for_f18"].isActive) then
			table.insert(typesFood, 18)
		end
		if (this.PLACES["placebox_f35_1"].isActive) then
			table.insert(typesFood, 35)
		end
		if (this.PLACES["placebox_sklad_for_f36"].isActive) then
			table.insert(typesFood, 36)
		end
		if (this.PLACES["placebox_sklad_for_f37"].isActive) then
			table.insert(typesFood, 37)
		end
		if (this.PLACES["placebox_sklad_for_f38"].isActive) then
			table.insert(typesFood, 38)
		end
		if (this.PLACES["placebox_sklad_for_f39"].isActive) then
			table.insert(typesFood, 39)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f35"].id then
			wishFood.type = this.PLACES["placebox_sklad_f35"].typeFood
			wishFood.offsetY = 70
			wishFood.places_id = {
				this.PLACES["placebox_f35_1"].id,
				this.PLACES["placebox_f35_2"].id,
				this.PLACES["placebox_f35_3"].id,
				this.PLACES["placebox_f35_4"].id
			}
			wishFood.skladName = global.foodName[35]
			wishFood.zavodName = 'apple_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f36"].id then
			wishFood.type = this.PLACES["placebox_sklad_f36"].typeFood
			wishFood.offsetY = 10
			wishFood.places_id = {
				this.PLACES["placebox_f36"].id
			}
			wishFood.skladName = global.foodName[36]
			wishFood.zavodName = 'sausage_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f3"].id then
			wishFood.type = this.PLACES["placebox_sklad_f3"].typeFood
			wishFood.offsetY = -10
			wishFood.places_id = {
				this.PLACES["placebox_f3"].id
			}
			wishFood.skladName = global.foodName[3]
			wishFood.zavodName = 'egg_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f15"].id then
			wishFood.type = this.PLACES["placebox_sklad_f15"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id
			}
			wishFood.skladName = global.foodName[15]
			wishFood.zavodName = 'wheat_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f18"].id then
			wishFood.type = this.PLACES["placebox_sklad_f18"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = global.foodName[18]
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f38"].id then
			wishFood.type = this.PLACES["placebox_sklad_f38"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f38"].id}
			wishFood.skladName = global.foodName[38]
			wishFood.zavodName = 'hotdog_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f37"].id then
			wishFood.type = this.PLACES["placebox_sklad_f37"].typeFood
			wishFood.offsetX = 65
			wishFood.offsetY = 80
			wishFood.places_id = {this.PLACES["placebox_f37"].id}
			wishFood.skladName = global.foodName[37]
			wishFood.zavodName = 'bread_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f39"].id then
			wishFood.type = this.PLACES["placebox_sklad_f39"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f39"].id}
			wishFood.skladName = global.foodName[39]
			wishFood.zavodName = 'apple_juice_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f36"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f36"].typeFood
			wishFood.offsetY = 70
			wishFood.places_id = {
				this.PLACES["placebox_f35_1"].id,
				this.PLACES["placebox_f35_2"].id,
				this.PLACES["placebox_f35_3"].id,
				this.PLACES["placebox_f35_4"].id
			}
			wishFood.skladName = 'apple_pig'
			wishFood.zavodName = 'apple_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f3"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f3"].typeFood
			wishFood.offsetY = 27
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id
			}
			wishFood.skladName = 'wheat_chicken'
			wishFood.zavodName = 'wheat_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f18"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f18"].typeFood
			wishFood.offsetY = 27
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id
			}
			wishFood.skladName = 'flour_zavod_chef'
			wishFood.zavodName = 'wheat_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f38"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f38"].typeFood
			wishFood.offsetY = 90
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = 'hotdog_zavod_chef1'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f38_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f38_2"].typeFood
			wishFood.offsetY = 35
			wishFood.places_id = {this.PLACES["placebox_f36"].id}
			wishFood.skladName = 'hotdog_zavod_chef2'
			wishFood.zavodName = 'sausage_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f37"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f37"].typeFood
			wishFood.offsetY = 90
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = 'bread_zavod_chef'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f39"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f39"].typeFood
			wishFood.offsetY = 70
			wishFood.places_id = {
				this.PLACES["placebox_f35_1"].id,
				this.PLACES["placebox_f35_2"].id,
				this.PLACES["placebox_f35_3"].id,
				this.PLACES["placebox_f35_4"].id
			}
			wishFood.skladName = 'apple_juice_zavod_chef'
			wishFood.zavodName = 'apple_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_f36"].id then
			table.insert(listNum, "placebox_aim2")
			table.insert(listNum, "placebox_f35_3")

		elseif vPrevPlaceId == this.PLACES["placebox_f35_2"].id then
			table.insert(listNum, "placebox_aim1")

		elseif vPrevPlaceId == this.PLACES["placebox_f35_3"].id then
			table.insert(listNum, "placebox_f35_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f3"].id then
			table.insert(listNum, "placebox_f15_3")
			table.insert(listNum, "placebox_aim5")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_3"].id then
			table.insert(listNum, "placebox_f15_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_4"].id then
			table.insert(listNum, "placebox_f15_5")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_5"].id then
			table.insert(listNum, "placebox_f15_6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f18"].id then
			table.insert(listNum, "placebox_aim3")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f38"].id then
			table.insert(listNum, "placebox_aim6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f39"].id then
			table.insert(listNum, "placebox_aim4")
			table.insert(listNum, "placebox_aim7")

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

			elseif vBoxId == this.PLACES["placebox_aim7"].id then
				gameState.dodikAssist7:updateVisible(true)
				gameState.dodikAssist7:showEffectExit()

			elseif vBoxId == this.PLACES["placebox_f35_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_f15_1"].id then
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_f3"].id then
				gameState:setZavodView(vBoxId, "placebox_sklad_for_f3", "animal")
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f18"].id then
				gameState:setZavodView(vBoxId, "placebox_f18", "applause")
				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

			elseif vBoxId == this.PLACES["placebox_f36"].id then
				gameState:setZavodView(vBoxId, "placebox_sklad_for_f36", "animal")
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f37"].id then
				gameState:setZavodView(vBoxId, "placebox_f37", "applause")
				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f38"].id then
				gameState:setZavodView(vBoxId, "placebox_f38", "applause", "placebox_sklad_for_f38_2")

			elseif vBoxId == this.PLACES["placebox_sklad_for_f39"].id then
				gameState:setZavodView(vBoxId, "placebox_f39", "applause")

			elseif vBoxId == this.PLACES["placebox_sklad_f18"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_nextmart"].id then
				gameState:placeShowNextMart(true, vmath.vector3(-200, 10 - 50, 0))

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
		p.x = this.posExit.x + 30*r
		p.y = this.posExit.y - 5*r

		return p
	end

	function this:addZavodViews()
		this.PLACES["placebox_f3"].linkSklad = this.PLACES["placebox_sklad_for_f3"].id
		this.PLACES["placebox_f18"].linkSklad = this.PLACES["placebox_sklad_for_f18"].id
		this.PLACES["placebox_f36"].linkSklad = this.PLACES["placebox_sklad_for_f36"].id
		this.PLACES["placebox_f37"].linkSklad = this.PLACES["placebox_sklad_for_f37"].id
		this.PLACES["placebox_f38"].linkSklad = this.PLACES["placebox_sklad_for_f38"].id
		this.PLACES["placebox_f38"].linkSklad2 = this.PLACES["placebox_sklad_for_f38_2"].id
		this.PLACES["placebox_f39"].linkSklad = this.PLACES["placebox_sklad_for_f39"].id

		gameState:addZavodObject('chicken',	this.PLACES["placebox_f3"].id, this.PLACES["placebox_sklad_for_f3"].id)
		gameState:addZavodObject('flour',	this.PLACES["placebox_f18"].id, this.PLACES["placebox_sklad_for_f18"].id)
		gameState:addZavodObject('pig',		this.PLACES["placebox_f36"].id, this.PLACES["placebox_sklad_for_f36"].id)
		gameState:addZavodObject('bread',	this.PLACES["placebox_f37"].id, this.PLACES["placebox_sklad_for_f37"].id)
		gameState:addZavodObject('hotdog',	this.PLACES["placebox_f38"].id, this.PLACES["placebox_sklad_for_f38"].id, this.PLACES["placebox_sklad_for_f38_2"].id)
		gameState:addZavodObject('apple_juice',	this.PLACES["placebox_f39"].id, this.PLACES["placebox_sklad_for_f39"].id)

		table.insert(gameState.listAnimalObjects, {id_zavod = 1, type = 'chicken'})
		table.insert(gameState.listAnimalObjects, {id_zavod = 3, type = 'pig'})

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f3"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f18"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f36"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f37"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f38"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f39"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f18", "placebox_f18", "wheat_mill1", vmath.vector3(0,10,0))
		gameState:updateZavodDecor("zavod_simple_v", "placebox_sklad_for_f37", "placebox_f37", "breadmaker1", vmath.vector3(-9,45,0))
		gameState:updateZavodDecor("zavod_big2", "placebox_sklad_for_f38", "placebox_f38", "hotdog_machine1", vmath.vector3(55,-16,0))
		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f39", "placebox_f39", "juicer1", vmath.vector3(0,20-30,0), 55+30)

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		gameState:addDecorObject('gate1_up', vmath.vector3(this.posGateExit.x-6,this.posGateExit.y-45,0), 130+45)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x-102,this.posGateExit.y-8,0), 50)
		gameState:addDecorObject('gate1_down', vmath.vector3(this.posGateExit.x+111,this.posGateExit.y-41,0), 50)

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
