DataMart4 = {}

function DataMart4:init()
	local this = {}

    this.posDodik      		= {x = 445, y = -710}				
    
	
	
	
	
	

	this.limitMoveX 		= {min = -1800, max = 1800}
    this.limitMoveY 		= {min = -1100, max = 1100}

	this.posExit   			= vmath.vector3(310, -900, 0)
	this.posStart   		= vmath.vector3(440, -800, 0)
	this.posDancefloor		= vmath.vector3(850, -480, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(467, -662, 0)
	this.posManager   		= vmath.vector3(755, -660, 0)
	this.posParrot   		= vmath.vector3(-130, -100, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(550, -800, 0)

    this.posTrash      		= {frame='trash1', x = 235, y = -660, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = 607, y = -765, radius = 10, offsetY = 35}

	this.placesCamera		= {}
	this.placesAlert		= {}

    this.listSalesMain		= {}
	this.aimPlaces			= {}
	this.NUMPLACE_LAST		= 1
	this.NUMPLACE_ZAVOD		= 0				
	this.NUMPLACE_MIN		= 0				

	this.typeFoodParrot		= 23

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

    this.pricePlaces		= global.pricePlaces4
    this.have_places		= global.have_places4

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
								link		= "placebox_f21_1",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(360,130-10,0),
								typeFood	= 21,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f21_2",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(260,195-10,0),
								typeFood	= 21,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f21_3",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(160,260-10,0),
								typeFood	= 21,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_f21",
								offsetY		= 5,
								offsetWork	= vmath.vector3(-10,-80,0),
								offsetBuy	= vmath.vector3(-30,-160,0),
								typeFood	= 21,
								nameFood	= 'shrimp',
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
								offsetGraphic = vmath.vector3(-3,-22,0),
								callInit 	= gameState.initSkladShrimp,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f22_1",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(360,130-10,0),
								typeFood	= 22,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f22_2",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(260,195-10,0),
								typeFood	= 22,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_f22_3",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(160,260-10,0),
								typeFood	= 22,
								countFood	= 1,
								maxCount	= 1,
								radius		= 2500,
								paid		= 0,
								zavodTick	= 0,
								zavodBuild	= gameState.buildTimePlants,
								stamina		= 1,
								stamina_max	= 1,
								isActive	= false,
								isZavod		= true,
								isHideSprite= true,
								callCollect	= gameState.collectSeafood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_f22",
								offsetY		= 30,
								offsetWork	= vmath.vector3(-20,-80,0),
								offsetBuy	= vmath.vector3(-30,-160,0),
								typeFood	= 22,
								nameFood	= 'fish',
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
								offsetGraphic = vmath.vector3(-7,-24,0),
								callInit 	= gameState.initSkladFish,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f23_1",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_2",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_3",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_4",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_5",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_6",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_7",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_8",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_9",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_10",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_11",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_f23_12",
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,-35,0),
								typeFood	= 23,
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
								link		= "placebox_sklad_f23",
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 23,
								typeSklad	= 'sklad_brevna',
								nameFood	= 'rice',
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
								link		= "placebox_sklad_f24",				
								offsetY		= 35,
								offsetWork	= vmath.vector3(10,-105,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 24,
								nameFood	= 'bowl_of_rice',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladChocolateBar,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f25",				
								offsetWork	= vmath.vector3(-5,-80,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 25,
								nameFood	= 'sushi',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladPeanutButter,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f26",				
								offsetWork	= vmath.vector3(-20,-80,0),
								offsetBuy	= vmath.vector3(-30,-140,0),
								typeFood	= 26,
								typeSklad	= 'sklad_2_paleta',
								nameFood	= 'roll',
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
								link		= "placebox_f27_1",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_f27_2",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_f27_3",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_f27_4",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_f27_5",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_f27_6",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-1,-42,0),
								typeFood	= 27,
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
								link		= "placebox_sklad_f27",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 27,
								nameFood	= 'soya_bean',
								countFood	= 0,
								maxCount	= 15,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladSoyaBean,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f28",				
								offsetY		= 70,
								offsetWork	= vmath.vector3(-20,-120,0),
								offsetBuy	= vmath.vector3(-30,-170,0),
								typeFood	= 28,
								nameFood	= 'soya_sauce',
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
								callInit 	= gameState.initSkladCoffeeGround,
								listFood	= {},
								places		= {}
							},
							
							{
								link		= "placebox_f24",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 24,
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
								link		= "placebox_sklad_for_f24",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-120,40,0),
								typeFood	= 23,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 15000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= true,
								listFood	= {},
								places		= {}
							},
							
							{
								link		= "placebox_sklad_for_f25",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,20,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-175,45,0),
								offsetPlaha	= vmath.vector3(-60,10,0),
								typeFood	= 21,
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
								link		= "placebox_sklad_for_f25_2",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-35,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(0,-7,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								typeFood	= 24,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 15000,
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
								link		= "placebox_f25",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-5,-25,0),
								offsetBoost	= vmath.vector3(60,-10,0),
								typeFood	= 25,
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
								link		= "placebox_sklad_for_f26",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,20,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-175,45,0),
								offsetPlaha	= vmath.vector3(-60,10,0),
								typeFood	= 22,
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
								link		= "placebox_sklad_for_f26_2",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-35,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(0,-7,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								typeFood	= 24,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 15000,
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
								link		= "placebox_f26",
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-5,-25,0),
								offsetBoost	= vmath.vector3(60,-10,0),
								typeFood	= 26,
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
								link		= "placebox_f28",
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 28,
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
								link		= "placebox_sklad_for_f28",
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-120,40,0),
								typeFood	= 27,
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
						1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,0,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,2,2,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,
						1,2,2,2,2,1,1,2,2,2,1,2,2,2,2,1,2,2,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,
						1,2,2,2,2,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,2,2,2,1,1,1,1,1,1,
						1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,2,2,2,1,2,2,2,1,1,1,1,1,1,
						1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,
						1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {234,268,269,304}
		elseif vNumPlaceBox == 30 then
			indexes = {439,440,441,474,475,476}
		elseif vNumPlaceBox == 17 then
			indexes = {257,258,259,260,292,293,294,295}
		elseif vNumPlaceBox == 31 then
			indexes = {408,409,410,443,444,445}
		elseif vNumPlaceBox == 43 then
			indexes = {609,610,611,612}
		elseif vNumPlaceBox == 13 then
			indexes = {262,263,264,297,298,299}
		elseif vNumPlaceBox == 40 then
			indexes = {412,413,414,447,448,449}
		elseif vNumPlaceBox == 41 then
			indexes = {382,383,384}
		elseif vNumPlaceBox == 51 then
			indexes = {556,557,558,559,560}
		elseif vNumPlaceBox == 33 then
			indexes = {282,283,284,285,317,318,319,320}
		elseif vNumPlaceBox == 47 then
			indexes = {530,531,532,533,534,535,564,565,566,567}
		elseif vNumPlaceBox == 32 then
			indexes = {288,289,290,323,324,325}
		elseif vNumPlaceBox == 44 then
			indexes = {422,423,424,425,426,427,457,458,459}
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
			this.PLACES["placebox_sklad_f23"].id,
			this.PLACES["placebox_sklad_f27"].id,
			this.PLACES["placebox_sklad_f28"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f23"].id,
			this.PLACES["placebox_sklad_f27"].id,
			this.PLACES["placebox_sklad_f28"].id,
			this.PLACES["placebox_f23_1"].id,
			this.PLACES["placebox_f23_2"].id,
			this.PLACES["placebox_f23_3"].id,
			this.PLACES["placebox_f23_4"].id,
			this.PLACES["placebox_f23_5"].id,
			this.PLACES["placebox_f23_6"].id,
			this.PLACES["placebox_f23_7"].id,
			this.PLACES["placebox_f23_8"].id,
			this.PLACES["placebox_f23_9"].id,
			this.PLACES["placebox_f23_10"].id,
			this.PLACES["placebox_f23_11"].id,
			this.PLACES["placebox_f23_12"].id,
			this.PLACES["placebox_f27_1"].id,
			this.PLACES["placebox_f27_2"].id,
			this.PLACES["placebox_f27_3"].id,
			this.PLACES["placebox_f27_4"].id,
			this.PLACES["placebox_f27_5"].id,
			this.PLACES["placebox_f27_6"].id,
			this.PLACES["placebox_f28"].id
		}


		gameState.dodikAssist3:setStockman(3, {				
			this.PLACES["placebox_sklad_f22"].id,
			this.PLACES["placebox_sklad_f21"].id,
			this.PLACES["placebox_sklad_f24"].id
		})

		gameState.dodikAssist3.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f21"].id,
			this.PLACES["placebox_f21_1"].id,
			this.PLACES["placebox_f21_2"].id,
			this.PLACES["placebox_f21_3"].id,
			this.PLACES["placebox_sklad_f22"].id,
			this.PLACES["placebox_f22_1"].id,
			this.PLACES["placebox_f22_2"].id,
			this.PLACES["placebox_f22_3"].id,
			this.PLACES["placebox_sklad_f24"].id,
			this.PLACES["placebox_f24"].id
		}

		gameState.dodikAssist4:setStockman(4, {				
			
			this.PLACES["placebox_sklad_f26"].id,
			this.PLACES["placebox_sklad_f25"].id
		})

		gameState.dodikAssist4.allowWorkPlaces = {
			
			this.PLACES["placebox_sklad_f26"].id,
			this.PLACES["placebox_sklad_f25"].id,
			
			this.PLACES["placebox_f26"].id,
			this.PLACES["placebox_f25"].id
		}

		gameState.dodikAssist5:setStockman(5, {				
			this.PLACES["placebox_sklad_for_f24"].id,
			this.PLACES["placebox_sklad_for_f28"].id
		})

		gameState.dodikAssist5.allowWorkPlaces = {
			this.PLACES["placebox_sklad_for_f24"].id,
			this.PLACES["placebox_sklad_for_f28"].id,
			this.PLACES["placebox_f23_1"].id,
			this.PLACES["placebox_f23_2"].id,
			this.PLACES["placebox_f23_3"].id,
			this.PLACES["placebox_f23_4"].id,
			this.PLACES["placebox_f23_5"].id,
			this.PLACES["placebox_f23_6"].id,
			this.PLACES["placebox_f23_7"].id,
			this.PLACES["placebox_f23_8"].id,
			this.PLACES["placebox_f23_9"].id,
			this.PLACES["placebox_f23_10"].id,
			this.PLACES["placebox_f23_11"].id,
			this.PLACES["placebox_f23_12"].id,
			this.PLACES["placebox_f27_1"].id,
			this.PLACES["placebox_f27_2"].id,
			this.PLACES["placebox_f27_3"].id,
			this.PLACES["placebox_f27_4"].id,
			this.PLACES["placebox_f27_5"].id,
			this.PLACES["placebox_f27_6"].id
		}

		gameState.dodikAssist6:setStockman(6, {				
			this.PLACES["placebox_sklad_for_f26"].id,
			this.PLACES["placebox_sklad_for_f26_2"].id,
			this.PLACES["placebox_sklad_for_f25"].id,
			this.PLACES["placebox_sklad_for_f25_2"].id
		})

		gameState.dodikAssist6.allowWorkPlaces = {
			this.PLACES["placebox_sklad_for_f26"].id,
			this.PLACES["placebox_sklad_for_f26_2"].id,
			this.PLACES["placebox_sklad_for_f25"].id,
			this.PLACES["placebox_sklad_for_f25_2"].id,
			this.PLACES["placebox_f24"].id,
			this.PLACES["placebox_f25"].id,
			this.PLACES["placebox_f21_1"].id,
			this.PLACES["placebox_f21_2"].id,
			this.PLACES["placebox_f21_3"].id,
			this.PLACES["placebox_f22_1"].id,
			this.PLACES["placebox_f22_2"].id,
			this.PLACES["placebox_f22_3"].id
		}
	end

	function this:updateDataMain()
		local listSalesMain = {
			"placebox_cashbox",
			"placebox_sklad_f23",
			"placebox_f23_1",
			"placebox_f23_2",
			"placebox_sklad_f22",
			"placebox_f22_1",
			"placebox_f22_2",
			"placebox_sklad_f24",
			"placebox_sklad_for_f24",
			"placebox_sklad_f21",
			"placebox_f21_1",
			"placebox_f21_2",
			"placebox_sklad_f27",
			"placebox_f27_1",
			"placebox_f27_2",
			"placebox_sklad_f28",
			"placebox_sklad_for_f28",
			"placebox_sklad_f26",
			"placebox_sklad_for_f26",
			"placebox_sklad_f25",
			"placebox_sklad_for_f25",
			"placebox_nextmart"
		}

		local listPlacesCamera = {
			"placebox_cashbox",
			"placebox_f23_2",
			"placebox_f22_2",
			"placebox_f21_2",
			"placebox_sklad_f24",
			"placebox_sklad_for_f24",
			"placebox_sklad_f27",
			"placebox_f27_2",
			"placebox_sklad_f28",
			"placebox_sklad_for_f28",
			"placebox_sklad_f26",
			"placebox_sklad_for_f26",
			"placebox_sklad_f25"
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

		if (global.numSale4 == 0) then
			
			global.numSale4 = 1
			global.amount_cashbox4 = datamanager.get_start_coins(4, this.listSalesMain, {2,3})
		end

		gameState.numSale		= global.numSale4
		gameState.amountCashBox	= global.amount_cashbox4
		gameState.defauiltSklad = "placebox_sklad_f23"
		gameState.funsquadSklads = {23,21,22,27}

		this.NUMPLACE_ZAVOD		= this.PLACES["placebox_sklad_for_f24"].id
		this.NUMPLACE_MIN		= this.PLACES["placebox_sklad_f22"].id

		this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]

		local dataSalesNum = datamanager.get_num_sale_values(4)
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
			this.PLACES["placebox_sklad_for_f24"].id,
			this.PLACES["placebox_sklad_for_f28"].id,
			this.PLACES["placebox_sklad_for_f26"].id,
			this.PLACES["placebox_sklad_for_f25"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f24"].id,this.PLACES["placebox_sklad_for_f24"].id},
			{this.PLACES["placebox_f28"].id,this.PLACES["placebox_sklad_for_f28"].id},
			{this.PLACES["placebox_f26"].id,this.PLACES["placebox_sklad_for_f26"].id,this.PLACES["placebox_sklad_for_f26_2"].id},
			{this.PLACES["placebox_f25"].id,this.PLACES["placebox_sklad_for_f25"].id,this.PLACES["placebox_sklad_for_f25_2"].id}
		}

	end

	function this:updateAlertPlaces()
		this.placesAlert['bowl_of_rice'] = 'bowl_of_rice_appliance'
		this.placesAlert['sushi'] = 'sushi_appliance'
		this.placesAlert['roll'] = 'roll_appliance'
		this.placesAlert['soya_sauce'] = 'soya_sauce_appliance'
		this.placesAlert['id_a2']	= 'relax_place2'
		this.placesAlert['id_a3']	= 'relax_place3'
		this.placesAlert['id_a4']	= 'relax_place4'
		this.placesAlert['id_a5']	= 'relax_place5'
		this.placesAlert['id_a6']	= 'relax_place6'

	end

	function this:updateNumSale(vNumSale)
		global.numSale4 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox4 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level4
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price4
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max4
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
		local indexes = {1,3,2,4,5,6,7,8,9,10}
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
			value3	= this.placesUpgrade[3][3]
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

	function this:getUpgradeCaravan(vNum)

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
			tile = gameState:getTileFromPos(placePos.x + 150, placePos.y + 150)
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

		elseif vNamePlace == 'relax_place5' then
			local placePos = this.PLACES["placebox_aim5"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'relax_place6' then
			local placePos = this.PLACES["placebox_aim6"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'shrimp' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f21"].id
			local placePos = this.PLACES["placebox_sklad_f21"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'fish' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f22"].id
			local placePos = this.PLACES["placebox_sklad_f22"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'rice' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f23"].id
			local placePos = this.PLACES["placebox_sklad_f23"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'bowl_of_rice' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f24"].id
			local placePos = this.PLACES["placebox_sklad_f24"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'sushi' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f25"].id
			local placePos = this.PLACES["placebox_sklad_f25"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'roll' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f26"].id
			local placePos = this.PLACES["placebox_sklad_f26"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'soya_bean' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f27"].id
			local placePos = this.PLACES["placebox_sklad_f27"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'soya_sauce' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f28"].id
			local placePos = this.PLACES["placebox_sklad_f28"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		
		elseif vNamePlace == 'shrimp_zavod' then
			tile = vmath.vector3(15,2,0)

		elseif vNamePlace == 'fish_zavod' then
			tile = vmath.vector3(9,3,0)

		elseif vNamePlace == 'rice_zavod' then
			tile = vmath.vector3(16,11,0)

		elseif vNamePlace == 'bowl_of_rice_zavod' then
			tile = vmath.vector3(16,16,0)

		elseif vNamePlace == 'roll_zavod' then
			tile = vmath.vector3(8,14,0)

		elseif vNamePlace == 'sushi_zavod' then
			tile = vmath.vector3(5,11,0)

		elseif vNamePlace == 'soya_bean_zavod' then
			tile = vmath.vector3(23,15,0)

		elseif vNamePlace == 'soya_sauce_zavod' then
			tile = vmath.vector3(33,14,0)

		elseif vNamePlace == 'bowl_of_rice_zavod_chef' then
			tile = vmath.vector3(13,16,0)

		elseif vNamePlace == 'soya_bean_zavod_chef' then
			tile = vmath.vector3(31,14,0)

		elseif vNamePlace == 'roll_zavod_chef1' then
			tile = vmath.vector3(3,15,0)

		elseif vNamePlace == 'roll_zavod_chef2' then
			tile = vmath.vector3(5,14,0)

		elseif vNamePlace == 'sishi_zavod_chef1' then
			tile = vmath.vector3(0,12,0)

		elseif vNamePlace == 'sishi_zavod_chef2' then
			tile = vmath.vector3(2,11,0)

		elseif vNamePlace == 'bowl_of_rice_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f24"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'soya_sauce_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f28"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'roll_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f26"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'sushi_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f25"].pos
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

		if (this.PLACES["placebox_f21_1"].isActive) then
			num = this.PLACES["placebox_sklad_f21"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f22_1"].isActive) then
			num = this.PLACES["placebox_sklad_f22"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f23_1"].isActive) then
			num = this.PLACES["placebox_sklad_f23"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f24"].isActive) then
			num = this.PLACES["placebox_sklad_f24"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f25"].isActive) then
			num = this.PLACES["placebox_sklad_f25"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f26"].isActive) then
			num = this.PLACES["placebox_sklad_f26"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f27_1"].isActive) then
			num = this.PLACES["placebox_sklad_f27"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f28"].isActive) then
			num = this.PLACES["placebox_sklad_f28"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f28"].id then
			countFood1 = this.PLACES["placebox_f28"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f28"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f24"].id then
			countFood1 = this.PLACES["placebox_f24"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f24"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f25"].id then
			countFood1 = this.PLACES["placebox_f25"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f25"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f25_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f26"].id then
			countFood1 = this.PLACES["placebox_f26"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f26"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f26_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		
		elseif (vId == this.PLACES["placebox_sklad_for_f25_2"].id) or
		(vId == this.PLACES["placebox_sklad_for_f26_2"].id) then
			countFood1 = this.PLACES["placebox_sklad_for_f24"].countFood
			countFood2 = this.PLACES["placebox_f24"].countFood

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

		if (this.PLACES["placebox_f21_1"].isActive) then
			table.insert(typesFood, 21)
		end
		if (this.PLACES["placebox_f22_1"].isActive) then
			table.insert(typesFood, 22)
		end
		if (this.PLACES["placebox_f23_1"].isActive) then
			table.insert(typesFood, 23)
		end
		if (this.PLACES["placebox_sklad_for_f24"].isActive) then
			table.insert(typesFood, 24)
		end
		if (this.PLACES["placebox_sklad_for_f25"].isActive) then
			table.insert(typesFood, 25)
		end
		if (this.PLACES["placebox_sklad_for_f26"].isActive) then
			table.insert(typesFood, 26)
		end
		if (this.PLACES["placebox_f27_1"].isActive) then
			table.insert(typesFood, 27)
		end
		if (this.PLACES["placebox_sklad_for_f28"].isActive) then
			table.insert(typesFood, 28)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f23"].id then
			wishFood.type = this.PLACES["placebox_sklad_f23"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f23_1"].id,
				this.PLACES["placebox_f23_2"].id,
				this.PLACES["placebox_f23_3"].id,
				this.PLACES["placebox_f23_4"].id,
				this.PLACES["placebox_f23_5"].id,
				this.PLACES["placebox_f23_6"].id,
				this.PLACES["placebox_f23_7"].id,
				this.PLACES["placebox_f23_8"].id,
				this.PLACES["placebox_f23_9"].id,
				this.PLACES["placebox_f23_10"].id,
				this.PLACES["placebox_f23_11"].id,
				this.PLACES["placebox_f23_12"].id
			}
			wishFood.skladName = 'rice'
			wishFood.zavodName = 'rice_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f27"].id then
			wishFood.type = this.PLACES["placebox_sklad_f27"].typeFood
			wishFood.offsetY = 50
			wishFood.places_id = {
				this.PLACES["placebox_f27_1"].id,
				this.PLACES["placebox_f27_2"].id,
				this.PLACES["placebox_f27_3"].id,
				this.PLACES["placebox_f27_4"].id,
				this.PLACES["placebox_f27_5"].id,
				this.PLACES["placebox_f27_6"].id
			}
			wishFood.skladName = 'soya_bean'
			wishFood.zavodName = 'soya_bean_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f28"].id then
			wishFood.type = this.PLACES["placebox_sklad_f28"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f28"].id}
			wishFood.skladName = 'soya_sauce'
			wishFood.zavodName = 'soya_sauce_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f22"].id then
			wishFood.type = this.PLACES["placebox_sklad_f22"].typeFood
			wishFood.offsetY = 0
			wishFood.places_id = {
				this.PLACES["placebox_f22_1"].id,
				this.PLACES["placebox_f22_2"].id,
				this.PLACES["placebox_f22_3"].id
			}
			wishFood.skladName = 'fish'
			wishFood.zavodName = 'fish_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f21"].id then
			wishFood.type = this.PLACES["placebox_sklad_f21"].typeFood
			wishFood.offsetY = 0
			wishFood.places_id = {
				this.PLACES["placebox_f21_1"].id,
				this.PLACES["placebox_f21_2"].id,
				this.PLACES["placebox_f21_3"].id
			}
			wishFood.skladName = 'shrimp'
			wishFood.zavodName = 'shrimp_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f24"].id then
			wishFood.type = this.PLACES["placebox_sklad_f24"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f24"].id}
			wishFood.skladName = 'bowl_of_rice'
			wishFood.zavodName = 'bowl_of_rice_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f26"].id then
			wishFood.type = this.PLACES["placebox_sklad_f26"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f26"].id}
			wishFood.skladName = 'roll'
			wishFood.zavodName = 'roll_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f25"].id then
			wishFood.type = this.PLACES["placebox_sklad_f25"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f25"].id}
			wishFood.skladName = 'sushi'
			wishFood.zavodName = 'sushi_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f24"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f24"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f23_1"].id,
				this.PLACES["placebox_f23_2"].id,
				this.PLACES["placebox_f23_3"].id,
				this.PLACES["placebox_f23_4"].id,
				this.PLACES["placebox_f23_5"].id,
				this.PLACES["placebox_f23_6"].id,
				this.PLACES["placebox_f23_7"].id,
				this.PLACES["placebox_f23_8"].id,
				this.PLACES["placebox_f23_9"].id,
				this.PLACES["placebox_f23_10"].id,
				this.PLACES["placebox_f23_11"].id,
				this.PLACES["placebox_f23_12"].id
			}
			wishFood.skladName = 'bowl_of_rice_zavod_chef'
			wishFood.zavodName = 'rice_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f28"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f28"].typeFood
			wishFood.offsetY = 35
			wishFood.places_id = {
				this.PLACES["placebox_f27_1"].id,
				this.PLACES["placebox_f27_2"].id,
				this.PLACES["placebox_f27_3"].id,
				this.PLACES["placebox_f27_4"].id,
				this.PLACES["placebox_f27_5"].id,
				this.PLACES["placebox_f27_6"].id
			}
			wishFood.skladName = 'soya_bean_zavod_chef'
			wishFood.zavodName = 'soya_bean_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f26"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f26"].typeFood
			wishFood.offsetY = 0
			wishFood.places_id = {
				this.PLACES["placebox_f22_1"].id,
				this.PLACES["placebox_f22_2"].id,
				this.PLACES["placebox_f22_3"].id
			}
			wishFood.skladName = 'roll_zavod_chef1'
			wishFood.zavodName = 'fish_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f26_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_f24"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f24"].id}
			wishFood.skladName = 'roll_zavod_chef2'
			wishFood.zavodName = 'bowl_of_rice_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f25"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f25"].typeFood
			wishFood.offsetY = 0
			wishFood.places_id = {
				this.PLACES["placebox_f21_1"].id,
				this.PLACES["placebox_f21_2"].id,
				this.PLACES["placebox_f21_3"].id
			}
			wishFood.skladName = 'sishi_zavod_chef1'
			wishFood.zavodName = 'shrimp_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f25_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_f24"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f24"].id}
			wishFood.skladName = 'sishi_zavod_chef2'
			wishFood.zavodName = 'bowl_of_rice_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_f21_2"].id then
			table.insert(listNum, "placebox_f21_3")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f26"].id then
			table.insert(listNum, "placebox_aim4")
			table.insert(listNum, "placebox_aim6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f28"].id then
			table.insert(listNum, "placebox_aim5")

		elseif vPrevPlaceId == this.PLACES["placebox_f22_2"].id then
			table.insert(listNum, "placebox_f22_3")
			table.insert(listNum, "placebox_aim3")

		elseif vPrevPlaceId == this.PLACES["placebox_f23_2"].id then
			table.insert(listNum, "placebox_aim1")
			table.insert(listNum, "placebox_f23_3")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_3"].id then
			table.insert(listNum, "placebox_f23_4")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_4"].id then
			table.insert(listNum, "placebox_f23_5")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_5"].id then
			table.insert(listNum, "placebox_f23_6")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_6"].id then
			table.insert(listNum, "placebox_f23_7")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_7"].id then
			table.insert(listNum, "placebox_f23_8")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_8"].id then
			table.insert(listNum, "placebox_f23_9")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_9"].id then
			table.insert(listNum, "placebox_f23_10")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_10"].id then
			table.insert(listNum, "placebox_f23_11")
		elseif vPrevPlaceId == this.PLACES["placebox_f23_11"].id then
			table.insert(listNum, "placebox_f23_12")

		elseif vPrevPlaceId == this.PLACES["placebox_f27_2"].id then
			table.insert(listNum, "placebox_aim2")
			table.insert(listNum, "placebox_f27_3")
		elseif vPrevPlaceId == this.PLACES["placebox_f27_3"].id then
			table.insert(listNum, "placebox_f27_4")
		elseif vPrevPlaceId == this.PLACES["placebox_f27_4"].id then
			table.insert(listNum, "placebox_f27_5")
		elseif vPrevPlaceId == this.PLACES["placebox_f27_5"].id then
			table.insert(listNum, "placebox_f27_6")

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

			elseif vBoxId == this.PLACES["placebox_sklad_f27"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_f22_1"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

				gameState:addDecorObject('billboard_fish', vmath.vector3(-870,-548,0), 50)
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

			elseif vBoxId == this.PLACES["placebox_f22_2"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

			elseif vBoxId == this.PLACES["placebox_f22_3"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

			elseif vBoxId == this.PLACES["placebox_f21_1"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

				gameState:addDecorObject('billboard_shrimp', vmath.vector3(47,-680,0), 50)
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

			elseif vBoxId == this.PLACES["placebox_f21_2"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

			elseif vBoxId == this.PLACES["placebox_f21_3"].id then
				local box = this.listPlaceBoxes[vBoxId]
				gameState:updateZavod(box)

			elseif vBoxId == this.PLACES["placebox_f23_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f24"].id then
				gameState:setZavodView(vBoxId, "placebox_f24", "applause")
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f25"].id then
				gameState:setZavodView(vBoxId, "placebox_f25", "applause", "placebox_sklad_for_f25_2")
				gameState:placeShowNextMart(false, vmath.vector3(0, -180, 0))

			elseif vBoxId == this.PLACES["placebox_sklad_for_f26"].id then
				gameState:setZavodView(vBoxId, "placebox_f26", "applause", "placebox_sklad_for_f26_2")
				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f28"].id then
				gameState:setZavodView(vBoxId, "placebox_f28", "applause")
				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

			elseif vBoxId == this.PLACES["placebox_nextmart"].id then
				gameState:placeShowNextMart(true, vmath.vector3(0, -180, 0))

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
		this.PLACES["placebox_f24"].linkSklad = this.PLACES["placebox_sklad_for_f24"].id
		this.PLACES["placebox_f25"].linkSklad = this.PLACES["placebox_sklad_for_f25"].id
		this.PLACES["placebox_f25"].linkSklad2 = this.PLACES["placebox_sklad_for_f25_2"].id
		this.PLACES["placebox_f26"].linkSklad = this.PLACES["placebox_sklad_for_f26"].id
		this.PLACES["placebox_f26"].linkSklad2 = this.PLACES["placebox_sklad_for_f26_2"].id
		this.PLACES["placebox_f28"].linkSklad = this.PLACES["placebox_sklad_for_f28"].id

		gameState:addZavodObject('bowl_of_rice',	this.PLACES["placebox_f24"].id, this.PLACES["placebox_sklad_for_f24"].id)
		gameState:addZavodObject('sushi',			this.PLACES["placebox_f25"].id, this.PLACES["placebox_sklad_for_f25"].id, this.PLACES["placebox_sklad_for_f25_2"].id)
		gameState:addZavodObject('roll',			this.PLACES["placebox_f26"].id, this.PLACES["placebox_sklad_for_f26"].id, this.PLACES["placebox_sklad_for_f26_2"].id)
		gameState:addZavodObject('soya_sauce',		this.PLACES["placebox_f28"].id, this.PLACES["placebox_sklad_for_f28"].id)

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f24"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f25"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f26"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f28"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateSkladDecor("sklad_morozilka", "placebox_sklad_f21", "sklad_shrimp1", vmath.vector3(2,0,0))
		gameState:updateSkladDecor("sklad_akvarium", "placebox_sklad_f22", "sklad_fish1", vmath.vector3(2,-1,0))
		gameState:updateSkladDecor("sklad_brevna", "placebox_sklad_f23", "sklad_rice1", vmath.vector3(-1,0,0))
		gameState:updateSkladDecor("sklad_3_stupeni", "placebox_sklad_f24", "sklad_bowl_of_rice1", vmath.vector3(0,0,0))
		gameState:updateSkladDecor("sklad_brevna", "placebox_sklad_f25", "sklad_sushi1", vmath.vector3(1,3,0))
		gameState:updateSkladDecor("sklad_2_paleta", "placebox_sklad_f26", "sklad_roll1", vmath.vector3(2,1,0))
		gameState:updateSkladDecor("sklad_palet", "placebox_sklad_f27", "sklad_soya_bean1", vmath.vector3(0,0,0))
		gameState:updateSkladDecor("sklad_2_polki", "placebox_sklad_f28", "sklad_soya_sauce1", vmath.vector3(-1,-1,0))

		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f24", "placebox_f24", "rice_cooker1", vmath.vector3(1,-4,0))
		gameState:updateZavodDecor("zavod_big2", "placebox_sklad_for_f25", "placebox_f25", "sushi_maker1", vmath.vector3(63,3,0))
		gameState:updateZavodDecor("zavod_big2", "placebox_sklad_for_f26", "placebox_f26", "roll_maker1", vmath.vector3(59,-2,0))
		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f28", "placebox_f28", "soya_sauce_machine1", vmath.vector3(-3,-7,0), 85)

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
