DataMart3 = {}

function DataMart3:init()
	local this = {}

    this.posDodik      		= {x = -700, y = -400}			
    
    

	this.limitMoveX 		= {min = -1900, max = 1900}
    this.limitMoveY 		= {min = -1200, max = 1200}

	this.posExit   			= vmath.vector3(-850, -890, 0)
	this.posStart   		= vmath.vector3(-625, -630, 0)
	this.posDancefloor		= vmath.vector3(-580, -490, 0)

	this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(0, 0, 0)
	this.posManager   		= vmath.vector3(-780, -560, 0)
	this.posParrot   		= vmath.vector3(-850, 60, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(-510, -710, 0)

    this.posTrash      		= {frame='trash1', x = -200, y = -585, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = -405, y = -625, radius = 10, offsetY = 35}

	this.placesCamera		= {1,38,12,41,27,36,21,40,25,37,44,42,29,43,33,39}
	this.placesAlert		= {}

    this.listSalesMain		= {1,38,11,12,41,27,36,21,40,25,37,44,42,29,43,33,39,30, 2}
	this.bankomatValue		= {20,20,20,20,20, 30,30,60,60,60, 90,90,150,150,150, 200,200,300}
	this.aimPlaces			= {3,4,5,6,7,8,9,10}
	this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]
	this.NUMPLACE_ZAVOD		= 0				
	this.NUMPLACE_MIN		= 0				

	this.typeFoodParrot		= 15

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

    this.pricePlaces		= global.pricePlaces3
	this.have_places		= global.have_places3

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
								link		= "placebox_f15_7",					
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
								link		= "placebox_f15_8",					
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
								link		= "placebox_f15_9",					
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
								link		= "placebox_sklad_for_f4",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(75,0,0),
								offsetView	= vmath.vector3(-135,0,0),
								flipView	= true,
								typeFood	= 15,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 7000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= false,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f4",					
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(110,-110,0),
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
								linkSklad	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							},
							{
								link		= "placebox_sklad_for_f4_2",		
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(75,0,0),
								offsetView	= vmath.vector3(-135,0,0),
								flipView	= true,
								typeFood	= 15,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 7000,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isPhysics	= false,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f4_2",					
								offsetY		= -30,
								offsetWork	= vmath.vector3(0,0,0),
								offsetBuy	= vmath.vector3(110,-110,0),
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
								linkSklad	= 0,
								callCollect	= gameState.updateViewFood,
								updateZavod	= gameState.updateZavod
							},
							
							{
								link		= "placebox_f17",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 17,
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
								link		= "placebox_sklad_for_f17",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-120,40,0),
								typeFood	= 4,
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
								link		= "placebox_f18",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
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
								link		= "placebox_f19",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(10,-10,0),
								offsetBuy	= vmath.vector3(0,0,0),
								typeFood	= 19,
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
								link		= "placebox_sklad_for_f19",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(-120,10,0),
								offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-120,40,0),
								typeFood	= 4,
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
								link		= "placebox_sklad_for_f16",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,20,0),
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
								link		= "placebox_sklad_for_f16_2",		
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-35,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								offsetSklad	= vmath.vector3(-4,-11,0),
								typeFood	= 10,
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
								link		= "placebox_f16",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-10,-10,0),
								offsetBoost	= vmath.vector3(60,0,0),
								typeFood	= 16,
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
								link		= "placebox_sklad_for_f20",			
								offsetY		= -30,
								offsetWork	= vmath.vector3(-170,20,0),
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
								link		= "placebox_sklad_for_f20_2",		
								offsetY		= -30,
								offsetWork	= vmath.vector3(-30,-35,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(0,-7,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								typeFood	= 17,
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
								link		= "placebox_f20",					
								offsetY		= 0,
								offsetWork	= vmath.vector3(0,-20,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetSklad	= vmath.vector3(-5,-25,0),
								offsetBoost	= vmath.vector3(60,-10,0),
								typeFood	= 20,
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
								link		= "placebox_sklad_f10",				
								offsetWork	= vmath.vector3(-20,-80,0),
								offsetBuy	= vmath.vector3(-30,-140,0),
								typeFood	= 10,
								typeSklad	= 'sklad_2_paleta',
								nameFood	= 'chocolate',
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
							    link		= "placebox_sklad_f15",
							    offsetWork	= vmath.vector3(-20,-100,0),
							    offsetBuy	= vmath.vector3(-40,-160,0),
							    typeFood	= 15,
							    typeSklad	= 'sklad_palet_15',
							    nameFood	= 'wheat',
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
								link		= "placebox_sklad_f16",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-150,0),
								typeFood	= 16,
								nameFood	= 'muffin',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladMuffin,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f17",				
								offsetY		= 70,
								offsetWork	= vmath.vector3(-20,-110,0),
								offsetBuy	= vmath.vector3(-30,-170,0),
								typeFood	= 17,
								nameFood	= 'butter',
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
								callInit 	= gameState.initSkladButter,
								listFood	= {},
								places		= {}
							},
							{
                                link		= "placebox_sklad_f18",				
                                offsetY		= 45,
                                offsetWork	= vmath.vector3(-10,-80,0),
                                offsetBuy	= vmath.vector3(-40,-160,0),
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
								link		= "placebox_sklad_f19",				
								offsetY		= 5,
								offsetWork	= vmath.vector3(-10,-80,0),
								offsetBuy	= vmath.vector3(-30,-160,0),
								typeFood	= 19,
								nameFood	= 'icecream',
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
								callInit 	= gameState.initSkladIceCream,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f20",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 20,
								nameFood	= 'cracker',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladCracker,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_caravan",				
								offsetY		= 10,
								offsetWork	= vmath.vector3(-10,-60,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								offsetDrive	= vmath.vector3(210,600,0),
								offsetFood	= vmath.vector3(0,-55,0),
								typeFood	= 10,
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
						1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,
						1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,
						1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,2,2,2,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,2,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,
						1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,0,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,2,2,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then
			indexes = {111,145,146,181}
		elseif vNumPlaceBox == 38 then
			indexes = {324,325,326,359,360,361}
		elseif vNumPlaceBox == 41 then
			indexes = {187,188,189}
		elseif vNumPlaceBox == 27 then
			indexes = {156,157,158,159,160}
		elseif vNumPlaceBox == 36 then
			indexes = {603,604,638}
		elseif vNumPlaceBox == 40 then
			indexes = {607,608,609}
		elseif vNumPlaceBox == 25 then
			indexes = {466,467,468,469,470,501}
		elseif vNumPlaceBox == 37 then
			indexes = {545,546,547,548,580,581,582,583}
		elseif vNumPlaceBox == 42 then
			indexes = {265,266,267,300,301,302}
		elseif vNumPlaceBox == 29 then
			indexes = {127,128,129,130,131}
		elseif vNumPlaceBox == 43 then
			indexes = {295,296,297,330,331,332}
		elseif vNumPlaceBox == 33 then
			indexes = {438,439,440,441,442,443,472,473,474,475}
		elseif vNumPlaceBox == 39 then
			indexes = {269,270,271,305,306}
		elseif vNumPlaceBox == 30 then
			indexes = {411,412,413,414,415,416,417}
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

		
		gameState.dodikAssist2:setStockman(1, {
			this.PLACES["placebox_sklad_f15"].id,
			this.PLACES["placebox_sklad_f4"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f15"].id,
			this.PLACES["placebox_sklad_f4"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f15_7"].id,
			this.PLACES["placebox_f15_8"].id,
			this.PLACES["placebox_f15_9"].id,
			this.PLACES["placebox_f4"].id,
			this.PLACES["placebox_f4_2"].id
		}


		gameState.dodikAssist3:setStockman(2, {				
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f17"].id,
			this.PLACES["placebox_sklad_f19"].id
		})
		gameState.dodikAssist3.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_f17"].id,
			this.PLACES["placebox_sklad_f19"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f19"].id,
			this.PLACES["placebox_f17"].id
		}

		gameState.dodikAssist4:setStockman(3, {				
			this.PLACES["placebox_sklad_f20"].id,
			this.PLACES["placebox_sklad_f16"].id,
			this.PLACES["placebox_sklad_f10"].id
		})
		gameState.dodikAssist4.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f20"].id,
			this.PLACES["placebox_sklad_f16"].id,
			this.PLACES["placebox_sklad_f10"].id,
			this.PLACES["placebox_f20"].id,
			this.PLACES["placebox_f16"].id,
			this.PLACES["placebox_caravan"].id
		}

		gameState.dodikAssist5:setStockman(4, {				
			this.PLACES["placebox_sklad_for_f4_2"].id,
			this.PLACES["placebox_sklad_for_f4"].id
		})
		gameState.dodikAssist5.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f4"].id,
			this.PLACES["placebox_sklad_for_f4_2"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f15_7"].id,
			this.PLACES["placebox_f15_8"].id,
			this.PLACES["placebox_f15_9"].id
		}

		gameState.dodikAssist6:setStockman(5, {				
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f17"].id,
			this.PLACES["placebox_sklad_for_f16"].id,
			this.PLACES["placebox_sklad_for_f16_2"].id
		})
		gameState.dodikAssist6.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f17"].id,
			this.PLACES["placebox_sklad_for_f16"].id,
			this.PLACES["placebox_sklad_for_f16_2"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f15_7"].id,
			this.PLACES["placebox_f15_8"].id,
			this.PLACES["placebox_f15_9"].id,
			this.PLACES["placebox_f4"].id,
			this.PLACES["placebox_f4_2"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_caravan"].id
		}

		gameState.dodikAssist7:setStockman(6, {				
			this.PLACES["placebox_sklad_for_f20"].id,
			this.PLACES["placebox_sklad_for_f20_2"].id,
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f19"].id
		})
		gameState.dodikAssist7.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f19"].id,
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f20"].id,
			this.PLACES["placebox_sklad_for_f20_2"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_f15_3"].id,
			this.PLACES["placebox_f15_4"].id,
			this.PLACES["placebox_f15_5"].id,
			this.PLACES["placebox_f15_6"].id,
			this.PLACES["placebox_f15_7"].id,
			this.PLACES["placebox_f15_8"].id,
			this.PLACES["placebox_f15_9"].id,
			this.PLACES["placebox_f4"].id,
			this.PLACES["placebox_f4_2"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f4"].id,
			this.PLACES["placebox_f4_2"].id,
			this.PLACES["placebox_f18"].id,
			this.PLACES["placebox_f17"].id
		}

	end

	function this:updateDataMain()
		local places = {
			this.PLACES["placebox_cashbox"].id,
			this.PLACES["placebox_sklad_f15"].id,
			this.PLACES["placebox_f15_1"].id,
			this.PLACES["placebox_f15_2"].id,
			this.PLACES["placebox_sklad_f18"].id,
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_f4"].id,
			this.PLACES["placebox_f4"].id,
			this.PLACES["placebox_sklad_f17"].id,
			this.PLACES["placebox_sklad_for_f17"].id,
			this.PLACES["placebox_sklad_f10"].id,
			this.PLACES["placebox_caravan"].id,
			this.PLACES["placebox_sklad_f19"].id,
			this.PLACES["placebox_sklad_for_f19"].id,
			this.PLACES["placebox_sklad_f20"].id,
			this.PLACES["placebox_sklad_for_f20"].id,
			this.PLACES["placebox_sklad_f16"].id,
			this.PLACES["placebox_sklad_for_f16"].id
		}

		
		

		if (global.numSale3 == 0) then
			
			global.numSale3 = 1
			global.amount_cashbox3 = datamanager.get_start_coins(3, this.listSalesMain, {2,3})
		end

		gameState.numSale		= global.numSale3
		gameState.amountCashBox	= global.amount_cashbox3
		gameState.defauiltSklad = "placebox_sklad_f15"
		gameState.funsquadSklads = {15,4,18}

		this.NUMPLACE_ZAVOD = this.PLACES["placebox_sklad_for_f18"].id
		this.NUMPLACE_MIN = this.PLACES["placebox_sklad_f4"].id

		local dataSalesNum = datamanager.get_num_sale_values(3)
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
			this.PLACES["placebox_sklad_for_f4"].id,
			this.PLACES["placebox_sklad_for_f4_2"].id,
			this.PLACES["placebox_sklad_for_f16"].id,
			this.PLACES["placebox_sklad_for_f17"].id,
			this.PLACES["placebox_sklad_for_f18"].id,
			this.PLACES["placebox_sklad_for_f19"].id,
			this.PLACES["placebox_sklad_for_f20"].id,
			this.PLACES["placebox_caravan"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f4"].id,this.PLACES["placebox_sklad_for_f4"].id},
			{this.PLACES["placebox_f4_2"].id,this.PLACES["placebox_sklad_for_f4_2"].id},
			{this.PLACES["placebox_f16"].id,this.PLACES["placebox_sklad_for_f16"].id,this.PLACES["placebox_sklad_for_f16_2"].id},
			{this.PLACES["placebox_f17"].id,this.PLACES["placebox_sklad_for_f17"].id},
			{this.PLACES["placebox_f18"].id,this.PLACES["placebox_sklad_for_f18"].id},
			{this.PLACES["placebox_f19"].id,this.PLACES["placebox_sklad_for_f19"].id},
			{this.PLACES["placebox_f20"].id,this.PLACES["placebox_sklad_for_f20"].id,this.PLACES["placebox_sklad_for_f20_2"].id}
		}

	end

	function this:updateAlertPlaces()
		this.placesAlert['cow'] = 'cow_animal'
		this.placesAlert['cow2'] = 'cow_animal2'
		this.placesAlert['muffin']		= 'muffin_appliance'
		this.placesAlert['butter']		= 'butter_appliance'
		this.placesAlert['flour']		= 'flour_appliance'
		this.placesAlert['icecream']	= 'icecream_appliance'
		this.placesAlert['cracker']		= 'cracker_appliance'
		this.placesAlert['id_a2'] = 'relax_place1'
		this.placesAlert['id_a3'] = 'relax_place2'
		this.placesAlert['id_a4'] = 'relax_place3'
		this.placesAlert['id_a5'] = 'relax_place4'
		this.placesAlert['id_a6'] = 'relax_place5'
		this.placesAlert['id_a7'] = 'relax_place6'

	end

	function this:updateNumSale(vNumSale)
		global.numSale3 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox3 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level3
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price3
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max3
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4,5,6,7}
		elseif (vType == 'list_id_zavods') then
			return {8,9,10,11,12,13,14}
		elseif (vType == 'list_id_caravans') then
			return {15}
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
		local indexes = {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15}
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
			value3	= this.placesUpgrade[3][3]
		elseif vNum == 11 then
			value1	= this.placesUpgrade[4][1]
			value2	= this.placesUpgrade[4][2]
		elseif vNum == 12 then
			value1	= this.placesUpgrade[5][1]
			value2	= this.placesUpgrade[5][2]
		elseif vNum == 13 then
			value1	= this.placesUpgrade[6][1]
			value2	= this.placesUpgrade[6][2]
		elseif vNum == 14 then
			value1	= this.placesUpgrade[7][1]
			value2	= this.placesUpgrade[7][2]
			value3	= this.placesUpgrade[7][3]
		end

		return {
			zavod = value1,
			zavodSklad = value2,
			zavodSklad2 = value3
		}
	end

	function this:getUpgradeCaravan(vNum)
		if vNum == 15 then
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
			tile = gameState:getTileFromPos(this.posBasket.x, this.posBasket.y)
		elseif vNamePlace == 'cashier' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x - 150, placePos.y)
		elseif vNamePlace == 'cashbox' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x + 150, placePos.y)
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
			tile = gameState:getTileFromPos(placePos.x, placePos.y)

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
		elseif vNamePlace == 'relax_place5' then
			local placePos = this.PLACES["placebox_aim6"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)
		elseif vNamePlace == 'relax_place6' then
			local placePos = this.PLACES["placebox_aim7"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'milk' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f4"].id
			local placePos = this.PLACES["placebox_sklad_f4"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'chocolate' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f10"].id
			local placePos = this.PLACES["placebox_sklad_f10"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'wheat' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f15"].id
			local placePos = this.PLACES["placebox_sklad_f15"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'muffin' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f16"].id
			local placePos = this.PLACES["placebox_sklad_f16"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'butter' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f17"].id
			local placePos = this.PLACES["placebox_sklad_f17"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 150)

		elseif vNamePlace == 'flour' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f18"].id
			local placePos = this.PLACES["placebox_sklad_f18"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 150)

		elseif vNamePlace == 'icecream' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f19"].id
			local placePos = this.PLACES["placebox_sklad_f19"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		elseif vNamePlace == 'cracker' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f20"].id
			local placePos = this.PLACES["placebox_sklad_f20"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

		
		elseif vNamePlace == 'milk_zavod' then
			local placePos = this.PLACES["placebox_f4"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y)

		elseif vNamePlace == 'wheat_zavod' then
			tile = vmath.vector3(5,9,0)

		elseif vNamePlace == 'muffin_zavod' then
			tile = vmath.vector3(30,10,0)

		elseif vNamePlace == 'butter_zavod' then
			tile = vmath.vector3(13,12,0)

		elseif vNamePlace == 'flour_zavod' then
			tile = vmath.vector3(18,3,0)

		elseif vNamePlace == 'icecream_zavod' then
			tile = vmath.vector3(24,2,0)

		elseif vNamePlace == 'cracker_zavod' then
			tile = vmath.vector3(21,11,0)

		elseif vNamePlace == 'chocolate_zavod' then
			local placePos = this.PLACES["placebox_caravan"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 140)

		
		elseif vNamePlace == 'muffin_zavod_chef1' then
			tile = vmath.vector3(25,10,0)

		elseif vNamePlace == 'muffin_zavod_chef2' then
			tile = vmath.vector3(27,10,0)

		elseif vNamePlace == 'butter_zavod_chef' then
			tile = vmath.vector3(9,13,0)

		elseif vNamePlace == 'flour_zavod_chef' then
			tile = vmath.vector3(15,3,0)

		elseif vNamePlace == 'icecream_zavod_chef' then
			tile = vmath.vector3(21,2,0)

		elseif vNamePlace == 'cracker_zavod_chef1' then
			tile = vmath.vector3(16,12,0)

		elseif vNamePlace == 'cracker_zavod_chef2' then
			tile = vmath.vector3(18,11,0)

		
		elseif vNamePlace == 'wheat_cow1' then
			tile = vmath.vector3(6,13,0)

		elseif vNamePlace == 'wheat_cow2' then
			tile = vmath.vector3(5,11,0)

		
		elseif vNamePlace == 'cow_animal' then
			local placePos = this.PLACES["placebox_sklad_for_f4"].pos
			tile = gameState:getTileFromPos(placePos.x - 160, placePos.y)

		elseif vNamePlace == 'cow_animal2' then
			local placePos = this.PLACES["placebox_sklad_for_f4_2"].pos
			tile = gameState:getTileFromPos(placePos.x - 160, placePos.y)

		
		elseif vNamePlace == 'muffin_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f16"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'butter_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f17"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'flour_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f18"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'icecream_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f19"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'cracker_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f20"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_f15_1"].isActive) then
			num = this.PLACES["placebox_sklad_f15"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f4"].isActive) then
			num = this.PLACES["placebox_sklad_f4"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_caravan"].isActive) then
			num = this.PLACES["placebox_sklad_f10"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f16"].isActive) then
			num = this.PLACES["placebox_sklad_f16"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f17"].isActive) then
			num = this.PLACES["placebox_sklad_f17"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f18"].isActive) then
			num = this.PLACES["placebox_sklad_f18"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f19"].isActive) then
			num = this.PLACES["placebox_sklad_f19"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f20"].isActive) then
			num = this.PLACES["placebox_sklad_f20"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0
		local countFood4 = 0

		if vId == this.PLACES["placebox_sklad_f4"].id then
			countFood1 = this.PLACES["placebox_f4"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f4"].countFood
			countFood3 = this.PLACES["placebox_f4_2"].countFood
			countFood4 = this.PLACES["placebox_sklad_for_f4_2"].countFood

			if (countFood1 == 0) and (countFood2 == 0) and (countFood3 == 0) and (countFood4 == 0)  then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f16"].id then
			countFood1 = this.PLACES["placebox_f16"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f16"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f16_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		elseif (vId == this.PLACES["placebox_sklad_f17"].id) or
		(vId == this.PLACES["placebox_sklad_for_f20_2"].id) then
			countFood1 = this.PLACES["placebox_f17"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f17"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f18"].id then
			countFood1 = this.PLACES["placebox_f18"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f18"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f19"].id then
			countFood1 = this.PLACES["placebox_f19"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f19"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f20"].id then
			countFood1 = this.PLACES["placebox_f20"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f20"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f20_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f10"].id then
			countFood1 = this.PLACES["placebox_caravan"].countFood

			if (countFood1 == 0) then
				isEmpty = true
			end

		
		elseif (vId == this.PLACES["placebox_sklad_for_f17"].id) or
		(vId == this.PLACES["placebox_sklad_for_f19"].id) then
			countFood1 = this.PLACES["placebox_sklad_for_f4"].countFood
			countFood2 = this.PLACES["placebox_f4"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f4_2"].countFood
			countFood4 = this.PLACES["placebox_f4_2"].countFood

			if (countFood1 == 0) and (countFood2 == 0) and (countFood3 == 0) and (countFood4 == 0)  then
				isEmpty = true
			end

		elseif (vId == this.PLACES["placebox_sklad_for_f16"].id) or
		(vId == this.PLACES["placebox_sklad_for_f20"].id) then
			countFood1 = this.PLACES["placebox_sklad_for_f18"].countFood
			countFood2 = this.PLACES["placebox_f18"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_for_f16_2"].id then
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

		if (this.PLACES["placebox_sklad_for_f4"].isActive) then
			table.insert(typesFood, 4)
		end
		if (this.PLACES["placebox_caravan"].isActive) then
			table.insert(typesFood, 10)
		end
		if (this.PLACES["placebox_f15_1"].isActive) then
			table.insert(typesFood, 15)
		end
		if (this.PLACES["placebox_sklad_for_f16"].isActive) then
			table.insert(typesFood, 16)
		end
		if (this.PLACES["placebox_sklad_for_f17"].isActive) then
			table.insert(typesFood, 17)
		end
		if (this.PLACES["placebox_sklad_for_f18"].isActive) then
			table.insert(typesFood, 18)
		end
		if (this.PLACES["placebox_sklad_for_f19"].isActive) then
			table.insert(typesFood, 19)
		end
		if (this.PLACES["placebox_sklad_for_f20"].isActive) then
			table.insert(typesFood, 20)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f4"].id then
			wishFood.type = this.PLACES["placebox_sklad_f4"].typeFood
			wishFood.offsetY = 35
			wishFood.places_id = {
				this.PLACES["placebox_f4"].id,
				this.PLACES["placebox_f4_2"].id
			}
			wishFood.skladName = 'milk'
			wishFood.zavodName = 'milk_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f15"].id then
			wishFood.type = this.PLACES["placebox_sklad_f15"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id,
				this.PLACES["placebox_f15_7"].id,
				this.PLACES["placebox_f15_8"].id,
				this.PLACES["placebox_f15_9"].id
			}
			wishFood.skladName = 'wheat'
			wishFood.zavodName = 'wheat_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f17"].id then
			wishFood.type = this.PLACES["placebox_sklad_f17"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f17"].id}
			wishFood.skladName = 'butter'
			wishFood.zavodName = 'butter_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f18"].id then
			wishFood.type = this.PLACES["placebox_sklad_f18"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = 'flour'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f19"].id then
			wishFood.type = this.PLACES["placebox_sklad_f19"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f19"].id}
			wishFood.skladName = 'icecream'
			wishFood.zavodName = 'icecream_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f20"].id then
			wishFood.type = this.PLACES["placebox_sklad_f20"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f20"].id}
			wishFood.skladName = 'cracker'
			wishFood.zavodName = 'cracker_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f16"].id then
			wishFood.type = this.PLACES["placebox_sklad_f16"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f16"].id}
			wishFood.skladName = 'muffin'
			wishFood.zavodName = 'muffin_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f10"].id then
			wishFood.type = this.PLACES["placebox_sklad_f10"].typeFood
			wishFood.offsetY = 120
			wishFood.places_id = {this.PLACES["placebox_caravan"].id}
			wishFood.skladName = 'chocolate'
			wishFood.zavodName = 'chocolate_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f4"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f4"].typeFood
			wishFood.offsetY = 27
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id,
				this.PLACES["placebox_f15_7"].id,
				this.PLACES["placebox_f15_8"].id,
				this.PLACES["placebox_f15_9"].id
			}
			wishFood.skladName = 'wheat_cow1'
			wishFood.zavodName = 'wheat_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f4_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f4_2"].typeFood
			wishFood.offsetY = 27
			wishFood.places_id = {
				this.PLACES["placebox_f15_1"].id,
				this.PLACES["placebox_f15_2"].id,
				this.PLACES["placebox_f15_3"].id,
				this.PLACES["placebox_f15_4"].id,
				this.PLACES["placebox_f15_5"].id,
				this.PLACES["placebox_f15_6"].id,
				this.PLACES["placebox_f15_7"].id,
				this.PLACES["placebox_f15_8"].id,
				this.PLACES["placebox_f15_9"].id
			}
			wishFood.skladName = 'wheat_cow2'
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
				this.PLACES["placebox_f15_6"].id,
				this.PLACES["placebox_f15_7"].id,
				this.PLACES["placebox_f15_8"].id,
				this.PLACES["placebox_f15_9"].id
			}
			wishFood.skladName = 'flour_zavod_chef'
			wishFood.zavodName = 'wheat_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f17"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f17"].typeFood
			wishFood.offsetY = 35
			wishFood.places_id = {
				this.PLACES["placebox_f4"].id,
				this.PLACES["placebox_f4_2"].id
			}
			wishFood.skladName = 'butter_zavod_chef'
			wishFood.zavodName = 'milk_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f19"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f19"].typeFood
			wishFood.offsetY = 35
			wishFood.places_id = {
				this.PLACES["placebox_f4"].id,
				this.PLACES["placebox_f4_2"].id
			}
			wishFood.skladName = 'icecream_zavod_chef'
			wishFood.zavodName = 'milk_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f16"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f16"].typeFood
			wishFood.offsetY = 90
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = 'muffin_zavod_chef1'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f16_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f16_2"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_caravan"].id}
			wishFood.skladName = 'muffin_zavod_chef2'
			wishFood.zavodName = 'chocolate_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f20"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f20"].typeFood
			wishFood.offsetY = 90
			wishFood.places_id = {this.PLACES["placebox_f18"].id}
			wishFood.skladName = 'cracker_zavod_chef1'
			wishFood.zavodName = 'flour_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f20_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f20_2"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f17"].id}
			wishFood.skladName = 'cracker_zavod_chef2'
			wishFood.zavodName = 'butter_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_sklad_f4"].id then
			table.insert(listNum, "placebox_aim2")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f16"].id then
			table.insert(listNum, "placebox_aim7")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f17"].id then
			table.insert(listNum, "placebox_aim3")
			table.insert(listNum, "placebox_f4_2")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f19"].id then
			table.insert(listNum, "placebox_aim6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f20"].id then
			table.insert(listNum, "placebox_aim4")

		elseif vPrevPlaceId == this.PLACES["placebox_f4"].id then
			table.insert(listNum, "placebox_f15_3")

		elseif vPrevPlaceId == this.PLACES["placebox_f4_2"].id then
			table.insert(listNum, "placebox_aim5")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_2"].id then
			table.insert(listNum, "placebox_aim1")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_3"].id then
			table.insert(listNum, "placebox_f15_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_4"].id then
			table.insert(listNum, "placebox_f15_5")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_5"].id then
			table.insert(listNum, "placebox_f15_6")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_6"].id then
			table.insert(listNum, "placebox_f15_7")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_7"].id then
			table.insert(listNum, "placebox_f15_8")

		elseif vPrevPlaceId == this.PLACES["placebox_f15_8"].id then
			table.insert(listNum, "placebox_f15_9")

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

			elseif vBoxId == this.PLACES["placebox_sklad_f19"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_f15_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_f4"].id then
				gameState:setZavodView(vBoxId, "placebox_sklad_for_f4", "animal")
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

			elseif vBoxId == this.PLACES["placebox_f4_2"].id then
				gameState:setZavodView(vBoxId, "placebox_sklad_for_f4_2", "animal")

			elseif vBoxId == this.PLACES["placebox_sklad_for_f16"].id then
				gameState:setZavodView(vBoxId, "placebox_f16", "applause", "placebox_sklad_for_f16_2")

				gameState:placeShowNextMart(false, vmath.vector3(0, -180, 0))

			elseif vBoxId == this.PLACES["placebox_sklad_for_f17"].id then
				gameState:setZavodView(vBoxId, "placebox_f17", "applause")
				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f18"].id then
				gameState:setZavodView(vBoxId, "placebox_f18", "applause")

			elseif vBoxId == this.PLACES["placebox_sklad_for_f19"].id then
				gameState:setZavodView(vBoxId, "placebox_f19", "applause")
				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f20"].id then
				gameState:setZavodView(vBoxId, "placebox_f20", "applause", "placebox_sklad_for_f20_2")
				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

			elseif vBoxId == this.PLACES["placebox_caravan"].id then
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

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
		p.x = this.posExit.x + 30*r
		p.y = this.posExit.y - 5*r

		return p
	end

	function this:addZavodViews()
		this.PLACES["placebox_f4"].linkSklad = this.PLACES["placebox_sklad_for_f4"].id
		this.PLACES["placebox_f4_2"].linkSklad = this.PLACES["placebox_sklad_for_f4_2"].id
		this.PLACES["placebox_f16"].linkSklad = this.PLACES["placebox_sklad_for_f16"].id
		this.PLACES["placebox_f16"].linkSklad2 = this.PLACES["placebox_sklad_for_f16_2"].id
		this.PLACES["placebox_f17"].linkSklad = this.PLACES["placebox_sklad_for_f17"].id
		this.PLACES["placebox_f18"].linkSklad = this.PLACES["placebox_sklad_for_f18"].id
		this.PLACES["placebox_f19"].linkSklad = this.PLACES["placebox_sklad_for_f19"].id
		this.PLACES["placebox_f20"].linkSklad = this.PLACES["placebox_sklad_for_f20"].id
		this.PLACES["placebox_f20"].linkSklad2 = this.PLACES["placebox_sklad_for_f20_2"].id

		gameState:addZavodObject('cow',			this.PLACES["placebox_f4"].id, this.PLACES["placebox_sklad_for_f4"].id)
		gameState:addZavodObject('cow',			this.PLACES["placebox_f4_2"].id, this.PLACES["placebox_sklad_for_f4_2"].id, nil, 'cow2')
		gameState:addZavodObject('muffin',		this.PLACES["placebox_f16"].id, this.PLACES["placebox_sklad_for_f16"].id, this.PLACES["placebox_sklad_for_f16_2"].id)
		gameState:addZavodObject('butter',		this.PLACES["placebox_f17"].id, this.PLACES["placebox_sklad_for_f17"].id)
		gameState:addZavodObject('flour',		this.PLACES["placebox_f18"].id, this.PLACES["placebox_sklad_for_f18"].id)
		gameState:addZavodObject('icecream',	this.PLACES["placebox_f19"].id, this.PLACES["placebox_sklad_for_f19"].id)
		gameState:addZavodObject('cracker',		this.PLACES["placebox_f20"].id, this.PLACES["placebox_sklad_for_f20"].id, this.PLACES["placebox_sklad_for_f20_2"].id)

		table.insert(gameState.listAnimalObjects, {id_zavod = 1, type = 'cow'})

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f4"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f4_2"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f16"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f17"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f18"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f19"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f20"].id)

	end

	

	function this:addGraphicsPlaces()
		local num = this.PLACES["placebox_cashbox"].id
		local box = this.listPlaceBoxes[num]
		local carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		gameState:updateSkladDecor("sklad_holodos", "placebox_sklad_f4", "sklad_milk1", vmath.vector3(-2,-1,0))

		local iconSklad = nil

		num = this.PLACES["placebox_sklad_f10"].id
		iconSklad = gameState:addDecorObject('sklad_chocolate1', vmath.vector3(this.listPlaceBoxes[num].x+12,this.listPlaceBoxes[num].y-30,0), 98)
		carpetPlace = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[num].x-86, y=this.listPlaceBoxes[num].y-45, z=DEEP_BACKGROUND})
		carpetPlace2 = addGraphic({sprite="carpet2", x=this.listPlaceBoxes[num].x+83, y=this.listPlaceBoxes[num].y-70, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		msg.post(carpetPlace2, "hide")
		this.listPlaceBoxes[num].carpet = carpetPlace
		this.listPlaceBoxes[num].carpet2 = carpetPlace2
		this.listPlaceBoxes[num].iconSklad = iconSklad

		gameState:updateSkladDecor("sklad_palet", "placebox_sklad_f15", "sklad_wheat1", vmath.vector3(3,-2,0))

		num = this.PLACES["placebox_sklad_f16"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_muffin1', vmath.vector3(box.x+16,box.y-14,0), 100)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-5, y=box.y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f17"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_butter1',vmath.vector3(box.x,box.y-70-1,0),166)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-10, y=box.y-115, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		gameState:updateSkladDecor("sklad_3_polki", "placebox_sklad_f18", "sklad_flour1", vmath.vector3(0,0,0))

		num = this.PLACES["placebox_sklad_f19"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_ice_cream1', vmath.vector3(box.x+18,box.y-14,0), 129)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-1, y=box.y-55, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f20"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_cracker1', vmath.vector3(box.x+18,box.y-14,0), 98)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-5, y=box.y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		local machine = nil

		
		num = this.PLACES["placebox_sklad_for_f16"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('muffin_maker1', vmath.vector3(box.x+60,box.y-7,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f16"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f17"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('butter_machine1', vmath.vector3(box.x-2,box.y+5,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f17"].id
		this.listPlaceBoxes[num].tree = machine

		gameState:updateZavodDecor("zavod_simple", "placebox_sklad_for_f18", "placebox_f18", "wheat_mill1", vmath.vector3(0,10,0))

		
		num = this.PLACES["placebox_sklad_for_f19"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('ice_cream_machine1', vmath.vector3(box.x,box.y-2,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f19"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f20"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('oven1', vmath.vector3(box.x+70,box.y-17,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f20"].id
		this.listPlaceBoxes[num].tree = machine

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		gameState:addDecorObject('billboard1', vmath.vector3(995,-480,0), 110)

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
