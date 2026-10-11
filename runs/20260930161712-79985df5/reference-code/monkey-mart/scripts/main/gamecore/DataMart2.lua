DataMart2 = {}

function DataMart2:init()
	local this = {}

    this.posDodik      		= {x = 1000, y = -50}			
    
    
    
    

    this.limitMoveX 		= {min = -1900, max = 1900}
    this.limitMoveY 		= {min = -1200, max = 1200}

	this.posExit   			= vmath.vector3(1475, -110, 0)
	this.posStart   		= vmath.vector3(1315, -80, 0)
	this.posDancefloor		= vmath.vector3(1040, -40, 0)

    this.posNextMarket 		= vmath.vector3(0, 0, 0)
	this.posGateExit   		= vmath.vector3(1335, 59, 0)
	this.posManager   		= vmath.vector3(770, -165, 0)
	this.posParrot   		= vmath.vector3(-890, 65, 0)
	this.posGoldenPig  		= vmath.vector3(0, 0, 0)
	this.posDeliveryBoy		= vmath.vector3(1300, 10, 0)
	
    this.posTrash      		= {frame='trash1', x = 980, y = -220, radius = 10, offsetY = 20}
    this.posBasket      	= {frame='baskets1', x = 1130, y = 100, radius = 10, offsetY = 35}

	this.placesCamera		= {1,13,20,27,37,28,33,32}
	this.placesAlert		= {}
    this.listSalesMain		= {1,15,14,13,20,16,17,29,35,27,23,22,30,37,28,33,32,41, 2}
	this.bankomatValue		= {15,15,15,15,15, 15,15,30,30,30, 40,40,80,80,100, 150,150,200}
	this.aimPlaces			= {3,4,5,6,7,8,9}
	this.NUMPLACE_LAST		= this.listSalesMain[#this.listSalesMain]
	this.NUMPLACE_ZAVOD		= 0				
	this.NUMPLACE_MIN		= 0				

	this.typeFoodParrot		= 9

	this.countUpgrades		= 0
	this.listUpgradesId		= {}
	this.placesUpgrade		= {}

    this.pricePlaces		= global.pricePlaces2
	this.have_places		= global.have_places2

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
								link		= "placebox_f7_5",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(5,-45,0),
								typeFood	= 7,
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
								link		= "placebox_f7_4",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(5,-45,0),
								typeFood	= 7,
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
								link		= "placebox_f7_3",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(5,-45,0),
								typeFood	= 7,
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
								link		= "placebox_f7_2",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(5,-45,0),
								typeFood	= 7,
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
								link		= "placebox_f7_1",					
								offsetY		= 20,
								offsetWork	= vmath.vector3(0,-40,0),
								offsetBuy	= vmath.vector3(5,-45,0),
								typeFood	= 7,
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
								link		= "placebox_sklad_f7",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 7,
								nameFood	= 'cocoa',
								countFood	= 0,
								maxCount	= 15,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladCocoa,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f8_1",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,-10,0),
								offsetBuy	= vmath.vector3(-5,-20,0),
								typeFood	= 8,
								countFood	= 3,
								maxCount	= 3,
								radius		= 2000,
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
								link		= "placebox_f8_2",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,-10,0),
								offsetBuy	= vmath.vector3(-5,-20,0),
								typeFood	= 8,
								countFood	= 3,
								maxCount	= 3,
								radius		= 2000,
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
								link		= "placebox_f8_3",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,-10,0),
								offsetBuy	= vmath.vector3(-5,-20,0),
								typeFood	= 8,
								countFood	= 3,
								maxCount	= 3,
								radius		= 2000,
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
								link		= "placebox_f8_4",					
								offsetY		= 5,
								offsetWork	= vmath.vector3(0,-10,0),
								offsetBuy	= vmath.vector3(-5,-20,0),
								typeFood	= 8,
								countFood	= 3,
								maxCount	= 3,
								radius		= 2000,
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
								link		= "placebox_sklad_f8",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 8,
								nameFood	= 'coffeebean',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladCoffeeBean,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_f9_1",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_f9_2",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_f9_3",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_f9_4",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_f9_5",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_f9_6",					
								offsetY		= 30,
								offsetWork	= vmath.vector3(0,-25,0),
								offsetBuy	= vmath.vector3(0,-30,0),
								typeFood	= 9,
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
								link		= "placebox_sklad_f9",				
								offsetWork	= vmath.vector3(-20,-100,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 9,
								nameFood	= 'peanut',
								countFood	= 0,
								maxCount	= 15,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladPeanut,
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
								link		= "placebox_sklad_f11",				
								offsetY		= 70,
								offsetWork	= vmath.vector3(-20,-120,0),
								offsetBuy	= vmath.vector3(-30,-170,0),
								typeFood	= 11,
								nameFood	= 'coffeeground',
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
								link		= "placebox_sklad_f12",				
								offsetWork	= vmath.vector3(-5,-80,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 12,
								nameFood	= 'peanutbutter',
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
								link		= "placebox_sklad_f13",				
								offsetY		= 45,
								offsetWork	= vmath.vector3(0,-50,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 13,
								nameFood	= 'cappuccino',
								countFood	= 0,
								maxCount	= 12,
								radius		= gameState.radiusSklad,
								paid		= 0,
								isActive	= false,
								isCollect	= true,
								isSklad		= true,
								isForBuyer	= true,
								isPhysics	= true,
								callInit 	= gameState.initSkladCappuccino,
								listFood	= {},
								places		= {}
							},
							{
								link		= "placebox_sklad_f14",				
								offsetY		= 35,
								offsetWork	= vmath.vector3(10,-105,0),
								offsetBuy	= vmath.vector3(-40,-160,0),
								typeFood	= 14,
								nameFood	= 'chocolatebar',
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
                                link		= "placebox_sklad_for_f10",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-120,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-120,40,0),
                                typeFood	= 7,
								typeSklad	= 'small',
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f10",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(20,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 10,
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
                                linkSklad	= 0,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
							{
                                link		= "placebox_sklad_for_f11",			
                                offsetY		= -80,
                                offsetWork	= vmath.vector3(-40,-60,0),
                                offsetBuy	= vmath.vector3(130,-30,0),
								offsetPlaha	= vmath.vector3(30,-110,0),
								offsetSklad	= vmath.vector3(-50,-70,0),
                                typeFood	= 8,
								typeSklad	= 'small',
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 14000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f11",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(20,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 11,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 14000,
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
                                link		= "placebox_sklad_for_f12",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-120,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-122,30,0),
                                typeFood	= 9,
								typeSklad	= 'small',
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f12",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,-50,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 12,
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
                                linkSklad	= 0,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
							{
                                link		= "placebox_sklad_for_f13",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-120,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
								offsetSklad	= vmath.vector3(-112,40,0),
                                typeFood	= 11,
								typeSklad	= 'small',
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                listFood	= {},
                                places		= {}
                            },
                            {
                                link		= "placebox_f13",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(20,0,0),
                                offsetBuy	= vmath.vector3(0,0,0),
                                typeFood	= 13,
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
                                linkSklad	= 0,
                                callCollect	= gameState.updateViewFood,
                                updateZavod	= gameState.updateZavod
                            },
							{
                                link		= "placebox_sklad_for_f14",			
                                offsetY		= -30,
                                offsetWork	= vmath.vector3(-170,0,0),
                                offsetBuy	= vmath.vector3(-30,-100,0),
                                offsetSklad	= vmath.vector3(-180,40,0),
								offsetPlaha	= vmath.vector3(-60,10,0),
                                typeFood	= 9,
								typeSklad	= 'small',
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
                                paid		= 0,
                                isActive	= false,
                                isCollect	= true,
                                isSklad		= true,
                                isPhysics	= true,
                                listFood	= {},
                                places		= {}
                            },
							{
								link		= "placebox_sklad_for_f14_2",		
								offsetY		= -30,
								offsetWork	= vmath.vector3(-50,-40,0),
								offsetBuy	= vmath.vector3(0,0,0),
								offsetPlaha	= vmath.vector3(55,0,0),
								offsetSklad	= vmath.vector3(-4,-11,0),
								typeFood	= 10,
								typeSklad	= 'small',
								countFood	= 0,
								maxCount	= 4,
								radius		= 12000,
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
                                link		= "placebox_f14",					
                                offsetY		= 0,
                                offsetWork	= vmath.vector3(0,-30,0),
                                offsetBuy	= vmath.vector3(0,0,0),
								offsetBoost	= vmath.vector3(20,-10,0),
                                typeFood	= 14,
                                countFood	= 0,
                                maxCount	= 4,
                                radius		= 12000,
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

	

	this.map_width	= 35
	this.map_height	= 20

	this.world		= {
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,2,1,2,2,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,
						1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,2,2,1,1,2,2,2,2,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,
						1,1,1,1,1,1,1,1,2,2,2,1,1,2,2,2,2,1,1,1,1,1,1,1,1,2,2,1,1,1,0,0,0,0,0,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,0,0,1,
						1,1,1,1,2,1,1,1,1,2,2,2,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,2,2,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,2,2,2,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,
						1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1
					}

	function this:getIndexes(vNumPlaceBox)
		local indexes = {}

		if vNumPlaceBox == 1 then			
			indexes = {307,341,342,377}
		elseif vNumPlaceBox == 15 then		
			indexes = {547,548,549,582,583,584}
		elseif vNumPlaceBox == 20 then		
			indexes = {577,578,579,580}
		elseif vNumPlaceBox == 27 then		
			indexes = {430,431,432,465,466,467}
		elseif vNumPlaceBox == 28 then		
			indexes = {435,436,437,438,439}
		elseif vNumPlaceBox == 29 then		
			indexes = {602,603,604,605}
		elseif vNumPlaceBox == 30 then		
			indexes = {289,290,324,325,326}
		elseif vNumPlaceBox == 31 then		
			indexes = {406,407,408}
		elseif vNumPlaceBox == 32 then		
			indexes = {265,266,267,300,301}
		elseif vNumPlaceBox == 33 then		
			indexes = {126,127,128,129,130}
		elseif vNumPlaceBox == 35 then		
			indexes = {425,460,461,495,496,531}
		elseif vNumPlaceBox == 37 then		
			indexes = {181,183,184,215,216,217,218}
		elseif vNumPlaceBox == 39 then		
			indexes = {293,294,295,296,297,329,330,331,332}
		elseif vNumPlaceBox == 41 then		
			indexes = {152,153,154,155,156,157,188,189,190}
		end

		return indexes

	end

	

	function this:setupDodiki()
		gameState.dodikAssist1:updateHat(2)
		gameState.dodikAssist2:updateHat(1)
		gameState.dodikAssist3:updateHat(1)
		gameState.dodikAssist4:updateHat(1)
		gameState.dodikAssist5:updateHat(4)
		gameState.dodikAssist6:updateHat(4)
		gameState.dodikManager:updateHat(5)

		gameState.dodikAssist2:setOptions({maxFood = 3})	
		gameState.dodikAssist3:setOptions({maxFood = 3})	
		gameState.dodikAssist4:setOptions({maxFood = 3})	
		gameState.dodikAssist5:setOptions({maxFood = 3})	
		gameState.dodikAssist6:setOptions({maxFood = 3})	

		
		gameState.dodikAssist2:setStockman(1, {
			this.PLACES["placebox_sklad_f7"].id,
			this.PLACES["placebox_sklad_f10"].id,
			this.PLACES["placebox_sklad_f14"].id
		})
		
		gameState.dodikAssist2.allowWorkPlaces = {
			this.PLACES["placebox_sklad_f7"].id,
			this.PLACES["placebox_sklad_f10"].id,
			this.PLACES["placebox_sklad_f14"].id,
			this.PLACES["placebox_f7_1"].id,
			this.PLACES["placebox_f7_2"].id,
			this.PLACES["placebox_f7_3"].id,
			this.PLACES["placebox_f7_4"].id,
			this.PLACES["placebox_f7_5"].id,
			this.PLACES["placebox_f10"].id,
			this.PLACES["placebox_f14"].id
		}

		gameState.dodikAssist3:setStockman(2, {				
			this.PLACES["placebox_sklad_f8"].id,
			this.PLACES["placebox_sklad_f11"].id,
			this.PLACES["placebox_sklad_f13"].id
		})
		gameState.dodikAssist3.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f8"].id,
			this.PLACES["placebox_sklad_f11"].id,
			this.PLACES["placebox_sklad_f13"].id,
			this.PLACES["placebox_f8_1"].id,
			this.PLACES["placebox_f8_2"].id,
			this.PLACES["placebox_f8_3"].id,
			this.PLACES["placebox_f8_4"].id,
			this.PLACES["placebox_f11"].id,
			this.PLACES["placebox_f13"].id
		}

		gameState.dodikAssist4:setStockman(3, {				
			this.PLACES["placebox_sklad_f9"].id,
			this.PLACES["placebox_sklad_f12"].id
		})
		gameState.dodikAssist4.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_f9"].id,
			this.PLACES["placebox_sklad_f12"].id,
			this.PLACES["placebox_f9_1"].id,
			this.PLACES["placebox_f9_2"].id,
			this.PLACES["placebox_f9_3"].id,
			this.PLACES["placebox_f9_4"].id,
			this.PLACES["placebox_f9_5"].id,
			this.PLACES["placebox_f9_6"].id,
			this.PLACES["placebox_f12"].id,
		}

		gameState.dodikAssist5:setStockman(4, {				
			this.PLACES["placebox_sklad_for_f10"].id,
			this.PLACES["placebox_sklad_for_f14"].id,
			this.PLACES["placebox_sklad_for_f14_2"].id
		})
		gameState.dodikAssist5.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f10"].id,
			this.PLACES["placebox_sklad_for_f14"].id,
			this.PLACES["placebox_sklad_for_f14_2"].id,
			this.PLACES["placebox_f7_1"].id,
			this.PLACES["placebox_f7_2"].id,
			this.PLACES["placebox_f7_3"].id,
			this.PLACES["placebox_f7_4"].id,
			this.PLACES["placebox_f7_5"].id,
			this.PLACES["placebox_f9_1"].id,
			this.PLACES["placebox_f9_2"].id,
			this.PLACES["placebox_f9_3"].id,
			this.PLACES["placebox_f9_4"].id,
			this.PLACES["placebox_f9_5"].id,
			this.PLACES["placebox_f9_6"].id,
			this.PLACES["placebox_f10"].id
		}

		gameState.dodikAssist6:setStockman(5, {				
			this.PLACES["placebox_sklad_for_f11"].id,
			this.PLACES["placebox_sklad_for_f12"].id,
			this.PLACES["placebox_sklad_for_f13"].id
		})
		gameState.dodikAssist6.allowWorkPlaces = {			
			this.PLACES["placebox_sklad_for_f12"].id,
			this.PLACES["placebox_sklad_for_f11"].id,
			this.PLACES["placebox_sklad_for_f13"].id,
			this.PLACES["placebox_f8_1"].id,
			this.PLACES["placebox_f8_2"].id,
			this.PLACES["placebox_f8_3"].id,
			this.PLACES["placebox_f8_4"].id,
			this.PLACES["placebox_f9_1"].id,
			this.PLACES["placebox_f9_2"].id,
			this.PLACES["placebox_f9_3"].id,
			this.PLACES["placebox_f9_4"].id,
			this.PLACES["placebox_f9_5"].id,
			this.PLACES["placebox_f9_6"].id,
			this.PLACES["placebox_f11"].id
		}

	end

	function this:updateDataMain()
		local places = {
			this.PLACES["placebox_cashbox"].id,
			this.PLACES["placebox_sklad_f7"].id,
			this.PLACES["placebox_f7_1"].id,
			this.PLACES["placebox_f7_2"].id,
			this.PLACES["placebox_sklad_f8"].id,
			this.PLACES["placebox_f8_1"].id,
			this.PLACES["placebox_f8_2"].id,
			this.PLACES["placebox_sklad_f11"].id,
			this.PLACES["placebox_sklad_for_f11"].id,
			this.PLACES["placebox_sklad_f9"].id,
			this.PLACES["placebox_f9_3"].id,
			this.PLACES["placebox_f9_2"].id,
			this.PLACES["placebox_sklad_f12"].id,
			this.PLACES["placebox_sklad_for_f12"].id,
			this.PLACES["placebox_sklad_f10"].id,
			this.PLACES["placebox_sklad_for_f10"].id,
			this.PLACES["placebox_sklad_f14"].id,
			this.PLACES["placebox_sklad_for_f14"].id
		}

		

		if (global.numSale2 == 0) then
			
			global.numSale2 = 1
			global.amount_cashbox2 = datamanager.get_start_coins(2, this.listSalesMain, {2,3})
		end

		gameState.numSale		= global.numSale2
		gameState.amountCashBox	= global.amount_cashbox2
		gameState.defauiltSklad = "placebox_sklad_f7"
		gameState.funsquadSklads = {7,8,9}

		this.NUMPLACE_ZAVOD = this.PLACES["placebox_sklad_for_f11"].id
		this.NUMPLACE_MIN = this.PLACES["placebox_sklad_f11"].id

		local dataSalesNum = datamanager.get_num_sale_values(2)
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
			this.PLACES["placebox_aim6"].id,
			this.PLACES["placebox_aim5"].id,
			this.PLACES["placebox_sklad_for_f11"].id,
			this.PLACES["placebox_sklad_for_f13"].id,
			this.PLACES["placebox_sklad_for_f12"].id,
			this.PLACES["placebox_sklad_for_f10"].id,
			this.PLACES["placebox_sklad_for_f14"].id
		}

		this.placesUpgrade		= {
			{this.PLACES["placebox_f11"].id,this.PLACES["placebox_sklad_for_f11"].id},
			{this.PLACES["placebox_f13"].id,this.PLACES["placebox_sklad_for_f13"].id},
			{this.PLACES["placebox_f12"].id,this.PLACES["placebox_sklad_for_f12"].id},
			{this.PLACES["placebox_f10"].id,this.PLACES["placebox_sklad_for_f10"].id},
			{this.PLACES["placebox_f14"].id,this.PLACES["placebox_sklad_for_f14"].id,this.PLACES["placebox_sklad_for_f14_2"].id}
		}


	end

	function this:updateAlertPlaces()
		this.placesAlert['chocolate'] = 'chocolate_appliance'
		this.placesAlert['coffeeground'] = 'coffeeground_appliance'
		this.placesAlert['peanutbutter'] = 'peanutbutter_appliance'
		this.placesAlert['cappuccino'] = 'cappuccino_appliance'
		this.placesAlert['chocolatebar'] = 'chocolatebar_appliance'
		this.placesAlert['id_a2'] = 'relax_place1'
		this.placesAlert['id_a3'] = 'relax_place2'
		this.placesAlert['id_a4'] = 'relax_place3'
		this.placesAlert['id_a5'] = 'relax_place4'
		this.placesAlert['id_a6'] = 'relax_place5'

	end

	function this:updateNumSale(vNumSale)
		global.numSale2 = vNumSale

	end

	function this:updateCashboxView(vValue)
		global.amount_cashbox2 = vValue

	end

	function this:getUpgradesData(vType)
		if (vType == 'upgrades_level') then
			return global.upgrades_level2
		elseif (vType == 'upgrades_price') then
			return global.upgrades_price2
		elseif (vType == 'upgrades_max') then
			return global.upgrades_max2
		elseif (vType == 'list_id_dodiks') then
			return {2,3,4,5,6}
		elseif (vType == 'list_id_zavods') then
			return {7,8,9,10,11}
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
		local indexes = {1,3,2,4,5,6,7,8,9,10,11}
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
			player = gameState.dodikAssist6
		elseif vNum == 6 then
			player = gameState.dodikAssist5
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
		elseif vNum == 11 then
			value1	= this.placesUpgrade[5][1]
			value2	= this.placesUpgrade[5][2]
			value3	= this.placesUpgrade[5][3]
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
			tile = vmath.vector3(29,9,0)
		elseif vNamePlace == 'cashier' then
			local placePos = this.PLACES["placebox_cashbox"].pos
			tile = gameState:getTileFromPos(placePos.x - 150, placePos.y)
		elseif vNamePlace == 'cashbox' then
			tile = vmath.vector3(28,10,0)
			isSkladPlace = true
			num = this.PLACES["placebox_cashbox"].id
		elseif vNamePlace == 'exit' then
			tile = vmath.vector3(33,8,0)
			isExitPlace = true

		elseif vNamePlace == 'dancefloor' then
			tile = gameState:getTileFromPos(this.posDancefloor.x, this.posDancefloor.y)

		elseif vNamePlace == 'trash' then
			tile = vmath.vector3(28,5,0)

		elseif vNamePlace == 'cocoa' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f7"].id
			local placePos = this.PLACES["placebox_sklad_f7"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'coffeebean' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f8"].id
			local placePos = this.PLACES["placebox_sklad_f8"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 160)
		elseif vNamePlace == 'peanut' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f9"].id
			local placePos = this.PLACES["placebox_sklad_f9"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'chocolate' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f10"].id
			local placePos = this.PLACES["placebox_sklad_f10"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'coffeeground' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f11"].id
			local placePos = this.PLACES["placebox_sklad_f11"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'peanutbutter' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f12"].id
			local placePos = this.PLACES["placebox_sklad_f12"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'cappuccino' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f13"].id
			local placePos = this.PLACES["placebox_sklad_f13"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)
		elseif vNamePlace == 'chocolatebar' then
			isSkladPlace = true
			num = this.PLACES["placebox_sklad_f14"].id
			local placePos = this.PLACES["placebox_sklad_f14"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - skladOffset)

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
		elseif vNamePlace == 'relax_place_m' then
			local placePos = this.PLACES["placebox_aim7"].pos
			tile = gameState:getTileFromPos(placePos.x-CELL_SIZE*0.5, placePos.y)

		elseif vNamePlace == 'cocoa_zavod' then
			tile = vmath.vector3(26,13,0)
		elseif vNamePlace == 'chocolate_zavod' then
			tile = vmath.vector3(23,2,0)
		elseif vNamePlace == 'chocolatebar_zavod' then
			tile = vmath.vector3(16,3,0)
		elseif vNamePlace == 'coffeebean_zavod' then
			tile = vmath.vector3(10,16,0)
		elseif vNamePlace == 'coffeeground_zavod' then
			tile = vmath.vector3(6,14,0)
		elseif vNamePlace == 'cappuccino_zavod' then
			tile = vmath.vector3(15,7,0)
		elseif vNamePlace == 'peanut_zavod' then
			tile = vmath.vector3(2,7,0)
		elseif vNamePlace == 'peanutbutter_zavod' then
			tile = vmath.vector3(7,4,0)

		elseif vNamePlace == 'chocolate_zavod_chef' then
			tile = vmath.vector3(20,2,0)
		elseif vNamePlace == 'chocolatebar_zavod_chef1' then
			tile = vmath.vector3(11,5,0)
		elseif vNamePlace == 'chocolatebar_zavod_chef2' then
			tile = vmath.vector3(13,3,0)
		elseif vNamePlace == 'peanut_zavod_chef' then
			tile = vmath.vector3(4,5,0)
		elseif vNamePlace == 'coffeeground_zavod_chef' then
			tile = vmath.vector3(5,12,0)
		elseif vNamePlace == 'cappuccino_zavod_chef' then
			tile = vmath.vector3(13,7,0)

		elseif vNamePlace == 'chocolate_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f10"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'coffeeground_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f11"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'peanutbutter_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f12"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'cappuccino_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f13"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'chocolatebar_appliance' then
			local placePos = this.PLACES["placebox_sklad_for_f14"].pos
			tile = gameState:getTileFromPos(placePos.x, placePos.y - 80)

		elseif vNamePlace == 'hooligan' then
			local pos = gameState.dodikHooligan.pos
			tile = gameState:getTileFromPos(pos.x, pos.y - 40)

		end

		return tile, num, isSkladPlace, isExitPlace
	end

	function this:fillWarehouses()
		local num = 0

		if (this.PLACES["placebox_f7_1"].isActive) then
			num = this.PLACES["placebox_sklad_f7"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f8_1"].isActive) then
			num = this.PLACES["placebox_sklad_f8"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_f9_1"].isActive) then
			num = this.PLACES["placebox_sklad_f9"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f10"].isActive) then
			num = this.PLACES["placebox_sklad_f10"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f11"].isActive) then
			num = this.PLACES["placebox_sklad_f11"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f12"].isActive) then
			num = this.PLACES["placebox_sklad_f12"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f13"].isActive) then
			num = this.PLACES["placebox_sklad_f13"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end
		if (this.PLACES["placebox_sklad_for_f14"].isActive) then
			num = this.PLACES["placebox_sklad_f14"].id
			this.listPlaceBoxes[num].countFood = math.random(0, this.listPlaceBoxes[num].maxCount-5)
		end

	end

	function this:checkEmptySklad(vId)
		local isEmpty = false
		local countFood1 = 0
		local countFood2 = 0
		local countFood3 = 0

		if vId == this.PLACES["placebox_sklad_f10"].id then
			countFood1 = this.PLACES["placebox_f10"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f10"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f11"].id then
			countFood1 = this.PLACES["placebox_f11"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f11"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f12"].id then
			countFood1 = this.PLACES["placebox_f12"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f12"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f13"].id then
			countFood1 = this.PLACES["placebox_f13"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f13"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_f14"].id then
			countFood1 = this.PLACES["placebox_f14"].countFood
			countFood2 = this.PLACES["placebox_sklad_for_f14"].countFood
			countFood3 = this.PLACES["placebox_sklad_for_f14_2"].countFood

			if (countFood1 == 0) and ((countFood2 == 0) or (countFood3 == 0)) then
				isEmpty = true
			end

		
		elseif vId == this.PLACES["placebox_sklad_for_f14_2"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f10"].countFood
			countFood2 = this.PLACES["placebox_f10"].countFood

			if (countFood1 == 0) and (countFood2 == 0) then
				isEmpty = true
			end

		elseif vId == this.PLACES["placebox_sklad_for_f13"].id then
			countFood1 = this.PLACES["placebox_sklad_for_f11"].countFood
			countFood2 = this.PLACES["placebox_f11"].countFood

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

		if (this.PLACES["placebox_f7_1"].isActive) then
			table.insert(typesFood, 7)
		end
		if (this.PLACES["placebox_f8_1"].isActive) then
			table.insert(typesFood, 8)
		end
		if (this.PLACES["placebox_f9_3"].isActive) then
			table.insert(typesFood, 9)
		end
		if (this.PLACES["placebox_sklad_for_f10"].isActive) then
			table.insert(typesFood, 10)
		end
		if (this.PLACES["placebox_sklad_for_f11"].isActive) then
			table.insert(typesFood, 11)
		end
		if (this.PLACES["placebox_sklad_for_f12"].isActive) then
			table.insert(typesFood, 12)
		end
		if (this.PLACES["placebox_sklad_for_f13"].isActive) then
			table.insert(typesFood, 13)
		end
		if (this.PLACES["placebox_sklad_for_f14"].isActive) then
			table.insert(typesFood, 14)
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

		
		if vPlaceId == this.PLACES["placebox_sklad_f7"].id then
			wishFood.type = this.PLACES["placebox_sklad_f7"].typeFood
			wishFood.offsetY = 50
			wishFood.places_id = {
				this.PLACES["placebox_f7_1"].id,
				this.PLACES["placebox_f7_2"].id,
				this.PLACES["placebox_f7_3"].id,
				this.PLACES["placebox_f7_4"].id,
				this.PLACES["placebox_f7_5"].id
			}
			wishFood.skladName = 'cocoa'
			wishFood.zavodName = 'cocoa_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f10"].id then
			wishFood.type = this.PLACES["placebox_sklad_f10"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f10"].id}
			wishFood.skladName = 'chocolate'
			wishFood.zavodName = 'chocolate_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f14"].id then
			wishFood.type = this.PLACES["placebox_sklad_f14"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f14"].id}
			wishFood.skladName = 'chocolatebar'
			wishFood.zavodName = 'chocolatebar_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f8"].id then
			wishFood.type = this.PLACES["placebox_sklad_f8"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f8_1"].id,
				this.PLACES["placebox_f8_2"].id,
				this.PLACES["placebox_f8_3"].id,
				this.PLACES["placebox_f8_4"].id
			}
			wishFood.skladName = 'coffeebean'
			wishFood.zavodName = 'coffeebean_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f11"].id then
			wishFood.type = this.PLACES["placebox_sklad_f11"].typeFood
			wishFood.offsetX = 65
			wishFood.offsetY = 80
			wishFood.places_id = {this.PLACES["placebox_f11"].id}
			wishFood.skladName = 'coffeeground'
			wishFood.zavodName = 'coffeeground_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f13"].id then
			wishFood.type = this.PLACES["placebox_sklad_f13"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f13"].id}
			wishFood.skladName = 'cappuccino'
			wishFood.zavodName = 'cappuccino_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_f9"].id then
			wishFood.type = this.PLACES["placebox_sklad_f9"].typeFood
			wishFood.offsetY = 40
			wishFood.places_id = {
				this.PLACES["placebox_f9_3"].id,
				this.PLACES["placebox_f9_2"].id,
				this.PLACES["placebox_f9_1"].id,
				this.PLACES["placebox_f9_4"].id,
				this.PLACES["placebox_f9_5"].id,
				this.PLACES["placebox_f9_6"].id
			}
			wishFood.skladName = 'peanut'
			wishFood.zavodName = 'peanut_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_f12"].id then
			wishFood.type = this.PLACES["placebox_sklad_f12"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f12"].id}
			wishFood.skladName = 'peanutbutter'
			wishFood.zavodName = 'peanutbutter_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f10"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f10"].typeFood
			wishFood.offsetY = 50
			wishFood.places_id = {
				this.PLACES["placebox_f7_1"].id,
				this.PLACES["placebox_f7_2"].id,
				this.PLACES["placebox_f7_3"].id,
				this.PLACES["placebox_f7_4"].id,
				this.PLACES["placebox_f7_5"].id
			}
			wishFood.skladName = 'chocolate_zavod_chef'
			wishFood.zavodName = 'cocoa_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f14"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f14"].typeFood
			wishFood.offsetY = 40
			wishFood.places_id = {
				this.PLACES["placebox_f9_3"].id,
				this.PLACES["placebox_f9_2"].id,
				this.PLACES["placebox_f9_1"].id,
				this.PLACES["placebox_f9_4"].id,
				this.PLACES["placebox_f9_5"].id,
				this.PLACES["placebox_f9_6"].id
			}
			wishFood.skladName = 'chocolatebar_zavod_chef1'
			wishFood.zavodName = 'peanut_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f14_2"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f14_2"].typeFood
			wishFood.offsetY = 95
			wishFood.places_id = {this.PLACES["placebox_f10"].id}
			wishFood.skladName = 'chocolatebar_zavod_chef2'
			wishFood.zavodName = 'chocolate_zavod'

		
		elseif vPlaceId == this.PLACES["placebox_sklad_for_f12"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f12"].typeFood
			wishFood.offsetY = 40
			wishFood.places_id = {
				this.PLACES["placebox_f9_3"].id,
				this.PLACES["placebox_f9_2"].id,
				this.PLACES["placebox_f9_1"].id,
				this.PLACES["placebox_f9_4"].id,
				this.PLACES["placebox_f9_5"].id,
				this.PLACES["placebox_f9_6"].id
			}
			wishFood.skladName = 'peanut_zavod_chef'
			wishFood.zavodName = 'peanut_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f11"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f11"].typeFood
			wishFood.offsetY = 30
			wishFood.places_id = {
				this.PLACES["placebox_f8_1"].id,
				this.PLACES["placebox_f8_2"].id,
				this.PLACES["placebox_f8_3"].id,
				this.PLACES["placebox_f8_4"].id
			}
			wishFood.skladName = 'coffeeground_zavod_chef'
			wishFood.zavodName = 'coffeebean_zavod'

		elseif vPlaceId == this.PLACES["placebox_sklad_for_f13"].id then
			wishFood.type = this.PLACES["placebox_sklad_for_f13"].typeFood
			wishFood.offsetX = 65
			wishFood.offsetY = 80
			wishFood.places_id = {this.PLACES["placebox_f11"].id}
			wishFood.skladName = 'cappuccino_zavod_chef'
			wishFood.zavodName = 'coffeeground_zavod'

		end

		return wishFood
	end

	

	function this:checkNextPlaceSale(vPrevPlaceId)
		local listNum = {}

		if vPrevPlaceId == this.PLACES["placebox_f7_2"].id then
			table.insert(listNum, "placebox_aim1")
			table.insert(listNum, "placebox_f7_3")

		elseif vPrevPlaceId == this.PLACES["placebox_f7_3"].id then
			table.insert(listNum, "placebox_f7_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f7_4"].id then
			table.insert(listNum, "placebox_f7_5")

		elseif vPrevPlaceId == this.PLACES["placebox_f8_2"].id then
			table.insert(listNum, "placebox_f8_3")

		elseif vPrevPlaceId == this.PLACES["placebox_f8_3"].id then
			table.insert(listNum, "placebox_f8_4")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f11"].id then
			table.insert(listNum, "placebox_aim2")
			table.insert(listNum, "placebox_aim3")
			table.insert(listNum, "placebox_sklad_f13")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_f13"].id then
			table.insert(listNum, "placebox_sklad_for_f13")

		elseif vPrevPlaceId == this.PLACES["placebox_f9_1"].id then
			table.insert(listNum, "placebox_f9_4")

		elseif vPrevPlaceId == this.PLACES["placebox_f9_2"].id then
			table.insert(listNum, "placebox_f9_1")

		elseif vPrevPlaceId == this.PLACES["placebox_f9_3"].id then
			table.insert(listNum, "placebox_aim4")
			
		elseif vPrevPlaceId == this.PLACES["placebox_f9_4"].id then
			table.insert(listNum, "placebox_f9_5")

		elseif vPrevPlaceId == this.PLACES["placebox_f9_5"].id then
			table.insert(listNum, "placebox_f9_6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_for_f13"].id then
			table.insert(listNum, "placebox_aim6")

		elseif vPrevPlaceId == this.PLACES["placebox_sklad_f14"].id then
			table.insert(listNum, "placebox_aim5")

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

			elseif vBoxId == this.PLACES["placebox_sklad_f12"].id then
				gameState:addManager()

			elseif vBoxId == this.PLACES["placebox_f7_1"].id then
				timer.delay(1.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer1) end)
				timer.delay(3.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer2) end)
				timer.delay(6.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer3) end)

			elseif vBoxId == this.PLACES["placebox_f8_1"].id then
				timer.delay(9.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer4) end)

			elseif vBoxId == this.PLACES["placebox_f9_3"].id then
				timer.delay(15.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer6) end)

				gameState:addDecorObject('billboard_peanut', vmath.vector3(-1310,200,0), 50)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f10"].id then
				local num = this.PLACES["placebox_f10"].id
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

				timer.delay(21.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer8) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f11"].id then
				local num = this.PLACES["placebox_f11"].id
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

				timer.delay(12.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer5) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f12"].id then
				local num = this.PLACES["placebox_f12"].id
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

				timer.delay(18.0, false, function() gameState:addNewBuyer(gameState.dodikCustomer7) end)

			elseif vBoxId == this.PLACES["placebox_sklad_for_f13"].id then
				local num = this.PLACES["placebox_f13"].id
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

			elseif vBoxId == this.PLACES["placebox_sklad_for_f14"].id then
				gameState:setZavodView(vBoxId, "placebox_f14", "applause", "placebox_sklad_for_f14_2")

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
		this.PLACES["placebox_f10"].linkSklad = this.PLACES["placebox_sklad_for_f10"].id
		this.PLACES["placebox_f11"].linkSklad = this.PLACES["placebox_sklad_for_f11"].id
		this.PLACES["placebox_f12"].linkSklad = this.PLACES["placebox_sklad_for_f12"].id
		this.PLACES["placebox_f13"].linkSklad = this.PLACES["placebox_sklad_for_f13"].id
		this.PLACES["placebox_f14"].linkSklad = this.PLACES["placebox_sklad_for_f14"].id
		this.PLACES["placebox_f14"].linkSklad2 = this.PLACES["placebox_sklad_for_f14_2"].id

		gameState:addZavodObject('chocolate',		this.PLACES["placebox_f10"].id, this.PLACES["placebox_sklad_for_f10"].id)
		gameState:addZavodObject('coffeeground',	this.PLACES["placebox_f11"].id, this.PLACES["placebox_sklad_for_f11"].id)
		gameState:addZavodObject('peanutbutter',	this.PLACES["placebox_f12"].id, this.PLACES["placebox_sklad_for_f12"].id)
		gameState:addZavodObject('cappuccino',		this.PLACES["placebox_f13"].id, this.PLACES["placebox_sklad_for_f13"].id)
		gameState:addZavodObject('chocolatebar',	this.PLACES["placebox_f14"].id, this.PLACES["placebox_sklad_for_f14"].id, this.PLACES["placebox_sklad_for_f14_2"].id)

	end

	function this:updateZavodBoost(vBool)
		gameState:boostZavod(vBool, this.PLACES["placebox_f10"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f11"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f12"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f13"].id)
		gameState:boostZavod(vBool, this.PLACES["placebox_f14"].id)

	end

	

	function this:addGraphicsPlaces()
		local num, box, iconSklad, carpetPlace = nil

		num = this.PLACES["placebox_sklad_f7"].id
		iconSklad = gameState:addDecorObject('sklad_cocoa1', vmath.vector3(this.listPlaceBoxes[num].x+18,this.listPlaceBoxes[num].y-23,0), 98)
		carpetPlace = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[num].x-10, y=this.listPlaceBoxes[num].y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		this.listPlaceBoxes[num].carpet = carpetPlace
		this.listPlaceBoxes[num].iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f8"].id
		iconSklad = gameState:addDecorObject('sklad_coffee_bean1', vmath.vector3(this.listPlaceBoxes[num].x+15,this.listPlaceBoxes[num].y-14,0), 98)
		carpetPlace = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[num].x-5, y=this.listPlaceBoxes[num].y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		this.listPlaceBoxes[num].carpet = carpetPlace
		this.listPlaceBoxes[num].iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f9"].id
		iconSklad = gameState:addDecorObject('sklad_peanut1', vmath.vector3(this.listPlaceBoxes[num].x+15,this.listPlaceBoxes[num].y-23,0), 98)
		carpetPlace = addGraphic({sprite="carpet1", x=this.listPlaceBoxes[num].x-10, y=this.listPlaceBoxes[num].y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		this.listPlaceBoxes[num].carpet = carpetPlace
		this.listPlaceBoxes[num].iconSklad = iconSklad

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

		num = this.PLACES["placebox_sklad_f11"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_coffee_ground1',vmath.vector3(box.x-1,box.y-70-1,0),168)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-10, y=box.y-115, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f12"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_peanut_butter1', vmath.vector3(box.x+15,box.y-14,0), 98)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-5, y=box.y-73, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f13"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_cappuccino1', vmath.vector3(box.x+6,box.y-45-1,0), 132)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-7, y=box.y-100, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_sklad_f14"].id
		box = this.listPlaceBoxes[num]
		iconSklad = gameState:addDecorObject('sklad_chocolate_bar1', vmath.vector3(box.x+30,box.y-35-1,0), 144)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x+25, y=box.y-80, z=DEEP_BACKGROUND})
		msg.post(iconSklad, "hide")
		msg.post(carpetPlace, "updateScale", {value = 1.15})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace
		box.iconSklad = iconSklad

		num = this.PLACES["placebox_cashbox"].id
		box = this.listPlaceBoxes[num]
		carpetPlace = addGraphic({sprite="carpet2", x=box.x-40, y=box.y-20, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f9_2"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x, y=box.y-30, z=DEEP_BACKGROUND})

		num = this.PLACES["placebox_f9_5"].id
		box = this.listPlaceBoxes[num]
		addGraphic({sprite="place_corn2", x=box.x, y=box.y-30, z=DEEP_BACKGROUND})

		local machine = nil

		
		num = this.PLACES["placebox_sklad_for_f10"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('chocolate_machine1', vmath.vector3(box.x+2,box.y+6,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f10"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f11"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('coffee_grinder1', vmath.vector3(box.x-18,box.y+12,0), 55)
		carpetPlace = addGraphic({sprite="carpet2", x=box.x+45, y=box.y-30, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f11"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f12"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('peanut_machine1', vmath.vector3(box.x+3,box.y+10,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f12"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f13"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('coffee_machine1', vmath.vector3(box.x+3,box.y+2,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-9, y=box.y-45, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f13"].id
		this.listPlaceBoxes[num].tree = machine

		
		num = this.PLACES["placebox_sklad_for_f14"].id
		box = this.listPlaceBoxes[num]
		machine = gameState:addDecorObject('chocolate_bar_machine1', vmath.vector3(box.x+55,box.y-2,0), 55)
		carpetPlace = addGraphic({sprite="carpet1", x=box.x-10, y=box.y-30, z=DEEP_BACKGROUND})
		msg.post(carpetPlace, "hide")
		msg.post(machine, "hide")
		msg.post(carpetPlace, "updateScale", {value = 1.4})
		box.carpet = carpetPlace

		num = this.PLACES["placebox_f14"].id
		this.listPlaceBoxes[num].tree = machine

	end

	function this:addDecorBack()
		gameState:addDecorBackground()

		addGraphic({sprite="place_corn3", x=-1700, y=-340, z=DEEP_BACKGROUND})

		gameState:addDecorObject('gate1_up', vmath.vector3(this.posGateExit.x,this.posGateExit.y-50,0), 200)

    end

    
	setmetatable(this,self)
	self.__index = self; return this
end
