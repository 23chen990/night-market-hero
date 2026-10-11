PLATFORM_WEB		= 0
PLATFORM_ANDROID	= 1
PLATFORM_IOS		= 2
halfPI = math.pi / 2


DEEP_TEXT				= 4.0
DEEP_CLOUD				= 3.5
DEEP_EFFECT				= 3.0
DEEP_CURSOR				= 2.5
DEEP_OBJECTS			= 2.0
DEEP_FOOD_ANIM			= 1.0
DEEP_PLAYERS			= 0.5	
DEEP_DUST				= 0.25
DEEP_SHADOW				= 0.2
DEEP_BACKGROUND			= 0.01

ROLE_BUYER				= 0
ROLE_WORKER				= 1
ROLE_CASHIER			= 2
ROLE_STOCKMAN			= 3
ROLE_ROWDY				= 4
ROLE_MANAGER			= 5
ROLE_DANCER				= 6
ROLE_DELIVERYBOY		= 7

ACTION_IDLE				= 0
ACTION_GO_BASKET		= 1
ACTION_PICKING			= 2
ACTION_GO_PAY			= 3
ACTION_PACKING			= 4
ACTION_EXIT				= 5
ACTION_SLEEP			= 6
ACTION_WAKEUP			= 7
ACTION_CRAZY			= 8

CELL_SIZE				= 80
TIME_COLLECT			= 0.15
TIME_BUYING				= 0.07
TIME_PAYING				= 0.5
TIME_PACKING			= 1.0
TIME_SHOW_OFFER			= 20
TIME_HIDE_OFFER			= 10
TIME_BREAK_ADS			= 5
TIME_SHOW_CRAZY			= 70
TIME_FUN_SQUAD			= 60 * 2
TIME_MONKEY_PUNCH		= 60 * 2
TIME_PARROT				= 60 * 5
TIME_BOOST				= 60 * 2
TIME_MANAGER_WORK		= 60 * 3
TIME_MANAGER_CD		 	= 10
TIME_FREE_CASH			= 20
TIME_CD_FREEGEMS		= 60 * 5
TIME_DELIVER_BOY_WORK	= 60 * 5
TIME_DELIVER_BOY_CD1	= 60 * 5
TIME_DELIVER_BOY_CD2	= 60 * 4
TIME_ADD_BONUS_1		= 60 * 2
TIME_ADD_BONUS_2		= 60 * 5

LIMIT_EFFECT			= 80
LIMIT_DROPPED			= 20

TICK_WAIT_BUYERS		= 60

local is_debug = sys.get_engine_info().is_debug

url_controller		= "main:/controller#controller"
url_controller_gui	= "main:/controller#loader"
url_screen_game		= "game:/main#game"
url_screen_gui_game	= "game:/gui#game"
url_gamepad_gui		= "game:/gui#gamepad"

url_debug_main		= "/controller#proxy_debug"
url_debug_gui		= "debug:/gui#debug"
url_debug_sfx		= "debug:/gui#debug_sfx"

url_popup_shop		= "game:/gui#popup_shop"
url_popup_upgrades	= "game:/gui#popup_upgrades"
url_popup_settings	= "game:/gui#popup_settings"
url_popup_markets	= "game:/gui#popup_markets"
url_popup_iap		= "game:/gui#popup_iap"
url_popup_details	= "game:/gui#popup_details"
url_popup_language	= "game:/gui#popup_language"
url_popup_info		= "game:/gui#popup_info"
url_popup_message	= "game:/gui#popup_message"
url_popup_watch		= "game:/gui#popup_confim_watch"
url_popup_daily_bonus	= "game:/gui#popup_daily_bonus"
url_popup_daily_quest	= "game:/gui#popup_daily_quest"
url_popup_delivery		= "game:/gui#popup_delivery"

url_audio_proxy_main	= "/controller#proxy_audio_main"
url_audio_proxy_add		= "/controller#proxy_audio_add"
url_audio_main 			= "audio_main:/audio#audio"
url_audio_add			= "audio_add:/audio#audio"
url_gui_change_font		= "game:/gui#change_font"

return {
	version 				= '',
	isDebug 				= is_debug,
	isAllowDebug			= is_debug,
	isAllowQA				= false,

	isDesktop				= true,
	isMobileTrue			= config.isMobileTrue,
	isAllowIAP				= config.isAllowIAP,
	
	isShowDebug				= false,
	isShowPhysics			= false,
	isShowTiles				= false,
	isShowRadius			= false,
	isShowUpgrade			= false,
	isTestDrawCall			= false,
	isUnlockPlaces			= false,
	isSkipSaveData			= false,
	isSkipTutorial			= false,
	isShiftPressed			= false,
	isCtrlPressed			= false,
	isGamePadDetected		= false,
	isAdBlocked				= false,
	isCheckCollision		= true,
	currentProxy			= nil,
	defaultLanguage			= "en",
	
	avaiableLanguages		= {'en', 'pt', 'ru', 'ja'},
	textLanguages 			= {
								en = "English",
								ru = "Русский",
								pt = "Português",
								ja = "日本語"
							},

	playingMusic			= "",
	gainMusic				= 0.6,
	gainSFX					= 1.0,
	gainVoice				= 1.0,
	isNetworkConnected		= true,
	isAudioReady			= false,
	isMusicLongLoaded		= false,
	isResourcesLoaded		= false,
	isMutedMusic			= is_debug,
	isMutedSfx 				= false,
	isMutedForAds			= false,
	isRewardBreak			= false,
	isCommercialBreak		= false,
	isAdBreak				= false,
	isTimeForAdBreak		= false,
	isCameraMoving			= false,
	isPopupOpened			= false,
	isPopupIapOpened		= false,
	isPopupQuestsOpened		= false,
	isPopupDeliveryOpened	= false,
	isGameGuiPressed		= false,
	isGameGuiReady			= false,
	isIapGuiReady			= false,
	isGamePadGuiReady		= false,
	isAllowRewarded			= false,
	numEvent				= 0,	
	event_day_end			= nil,
	numMarket				= 1,
	maxMarket				= 6,	

	amount_gems				= 0,
	rewardedHat				= 0,
	rewardedCoins			= 100,
	rewardedGems			= 50,

	typeOffer				= "",
	typeFoodOffer			= 1,
	tickBoostCoinsX2		= 0,
	tickBoostWorkers		= 0,
	tickBoostZavods			= 0,
	tickBoostManager		= 0,
	tickBoostBoots			= 0,

	data_hats				= {
								{num = 1,	view=0,		type='gems',	amount=0},
								{num = 2,	view=11,	type='free',	amount=1},
								{num = 3,	view=12,	type='gems',	amount=30},

								{num = 4,	view=13,	type='gems',	amount=30},
								{num = 5,	view=14,	type='gems',	amount=50},
								{num = 6,	view=15,	type='gems',	amount=60},

								{num = 26,	view=47,	type='quest',	amount=0},
								{num = 27,	view=48,	type='iap',		amount=0},
								{num = 28,	view=49,	type='iap',		amount=0},

								{num = 7,	view=16,	type='gems',	amount=100},
								{num = 8,	view=17,	type='gems',	amount=100},
								{num = 9,	view=18,	type='gems',	amount=100},

								{num = 10,	view=19,	type='gems',	amount=150},
								{num = 11,	view=20,	type='gems',	amount=150},
								{num = 12,	view=21,	type='gems',	amount=200},

								{num = 13,	view=22,	type='gems',	amount=200},
								{num = 14,	view=23,	type='gems',	amount=200},
								{num = 15,	view=24,	type='gems',	amount=250},

								{num = 16,	view=25,	type='gems',	amount=300},
								{num = 17,	view=26,	type='gems',	amount=500},
								{num = 18,	view=27,	type='gems',	amount=400},

								{num = 19,	view=28,	type='gems',	amount=400},
								{num = 20,	view=29,	type='gems',	amount=500},
								{num = 21,	view=30,	type='quest',	amount=0},

								{num = 22,	view=31,	type='quest',	amount=0},
								{num = 23,	view=32,	type='coinsH',	amount=10000},
								{num = 24,	view=38,	type='quest',	amount=0},

								{num = 25,	view=39,	type='coinsC',	amount=15000}
							},

	have_hats				= {},
	tick_boosts				= {0,0,0,0},
	launch_date				= 0,
	lastplay_date			= 0,
	selectedHat				= 0,

	kf_coins_rewarded		= 0.2,
	kf_coins_gold_pig		= 0.4,
	kf_coins_ads			= 0.1,
	kf_coins_dropped		= 0.05,
	kf_coins_delivery		= 0.1,
	kf_coins_gems			= 0.6,

	priceFood				= {
								10,10,20,20,30,30,
								10,10,10,20,20,20,30,40,
								10,50,20,20,30,60,
								20,20,10,20,50,50,10,20,
								10,10,20,
								20,10,20,
								10,20,30,50,20,
								10,20,10,10,10,20,20,40
							},

	maxTypeFood				= {
								4,4,2,2,2,2,
								3,3,3,2,2,2,2,2,
								4,2,2,2,2,2,
								3,3,4,2,2,2,4,2,
								3,3,2,
								2,3,2,
								4,2,2,2,2,
								4,2,4,4,4,2,2,2
							},

	easyTypeFood			= {1,2,7,8,9,15,23,29,30,33,35,40,42,43,44},
	complexTypeFood			= {13,14,16,20,25,26,38},
	amount_ads				= 10,
	amount_golden_pig		= 3000,
	amount_delivery_reward	= 0,
	timeIndicator			= 90,

	gems_by_coins			= {10,40,100},
	gems_by_ads				= {3,5,7,10},

	daily_gems				= {5,10,15,20,25,30,35},

	quests				 	= {},
	state_daily_gems		= 0,
	cooldown_daily_gems		= 0,
	state_daily_bonus		= 1,
	isAllowBonus			= false,

	amount1_iap				= 15,
	amount2_iap				= 40,
	amount3_iap				= 120,
	amount4_iap				= 300,
	amount5_iap				= 700,
	amount6_iap				= 1100,

	boost_min_iap			= 15,

	noads_iap				= false,
	isBoughtManager			= false,
	isBoughtFruit			= false,
	have_iap				= {},

	selected_sfx			= {2,2,1,4,1,3,1,1,1,1,1},

	listOffers				= {"boost_coinsX2","boost_energyWork","boost_energyZavod","boost_bankomat"},

	foodName				= {
								'banan','corn','egg','milk','popcorn',
								'yogurt','cocoa','coffeebean','peanut','chocolate',
								'coffeeground','peanutbutter','cappuccino','chocolatebar','wheat',
								'muffin','butter','flour','icecream','cracker',
								'shrimp','fish','rice','bowl_of_rice','sushi',
								'roll','soya_bean','soya_sauce','pumpkin','mushroom',
								'potion','cookie','christmas_tree','wreath',
								'apple','sausage','bread','hotdog','apple_juice',
								'water','ice','mango','lemon','coconut','coconut_juice','mango_ice_cream','lemonade'
							},

	foodZavodName			= {
								'-','-','icon_chicken','icon_cow','icon_microwave',
								'icon_yogurt_machine','-','-','-','icon_chocolate_machine',
								'icon_coffee_grinder','icon_peanut_machine','icon_coffee_machine','icon_chocolate_bar_machine','-',
								'icon_muffin_maker','icon_butter_machine','icon_wheat_mill','icon_ice_cream_machine','icon_oven',
								'-','-','-','icon_rice_cooker','icon_sushi_maler',
								'icon_roll_maker','-','icon_soya_sauce_machine','-','-',
								'icon_caildron','icon_cookie_maker','-','icon_wreath_maker',
								'-','icon_pig','icon_breadmaker','icon_hotdog_machine','icon_juicer',
								'-','icon_ice_maker','-','-','-','icon_coconut_juice_maker','icon_mango_ice_cream_maker','icon_lemonade_maker'
							}

}
