local M = {}

M.VERBOSE = true

function M.test1(products)
	if M.VERBOSE then
		print("[DEBUG Manager] test1")
	end

	local this = gameState

	
	
	
	

	

	

	
	

	
	

	

	
	
	
	

	
	

	

	

	

	

	
	
	

	

	
	
	
	
	
	
	
	
	

	
	

	
	
	

	
	
	
	

	
	
	
	
	
	
	
	
	
	

	
	
	

	

	

	
	
	
	
	

	
	
	
	
	
	
	
	
	
	
	
	



	
	
	
	this:addTestBuyers(5)
	
	

	
	
	
	
	
	

	
	

	

	
	

	

	

	
	

	
	

	
	
	
	
	
	

	
	
	
	
	
	
	
	
	
	
	
	
	

	
	

	

	
	
	

	

	
	

	
	
	
	
	
	
	
	
	

	
	

	

	
	

	
	

	

	
	

	

end

function M.test2(products)
	if M.VERBOSE then
		print("[DEBUG Manager] test2")
	end

	local this = gameState

	lume.trace('this.indicatorPig.isReady', this.indicatorPig.isReady)
	lume.trace('this.indicatorSpeedBoots.isReady', this.indicatorSpeedBoots.isReady)
	lume.trace('global.tickBoostBoots', global.tickBoostBoots)

	

	
	

	
	

	
	

	
	
	
	

	

end

function M.test3(products)
	if M.VERBOSE then
		print("[DEBUG Manager] test3")
	end

	local this = gameState

	
	
	

	

	
	

	
	
	
	

	
	

	
	

end

function M.test4(products)
	if M.VERBOSE then
		print("[DEBUG Manager] test4")
	end

	local this = gameState

	
	

	

	

	

	
	
	
	

	

	

	
	
	

	

	
	

	
	
	

	
	
	
	

	

	

	

	
	

	
	

	
	

	

	
	

	
	

	
	
	
	

	

	

	

	
	

	

	
	

	

	
	
	
	
	
	
	
	

	

	
	
	
	

	
	

	

	

	

	

	

	

	
	
	
	
	

	
	
	

	
	
	
	

	
	
	
	
	
	
	
	
	

	

	
	

	

	

















end

function M.addDroppedObjects()
	local this = gameState

	
	
	
	
	
	
	
	
	

	this:addDroppedObject(1, vmath.vector3(-270, 370, 0))
	this:addDroppedObject(1, vmath.vector3(-270, 380, 0))
	this:addDroppedObject(1, vmath.vector3(-270, 390, 0))
	this:addDroppedObject(1, vmath.vector3(-270, 390, 0))
	
	

	
	
	

	
	
	
	
	
	
	
	

	
	
	
	

	
	
	
	
	
end

function M.getNewPrices(vNum)
	local str = ''
	local n = vNum
	local value = 0

	for k,v in pairs(global['pricePlaces'..n]) do
		v = v * 10
		str = str .. v .. ','
	end

	pprint()
	lume.trace('numMarket',vNum)
	pprint('{'..str..'}')
	pprint()

	str = ''
	for k,v in pairs(global['upgrades_price'..n]) do
		v[1][1] = v[1][1] * 10
		v[1][2] = v[1][2] * 10
		v[1][3] = v[1][3] * 10

		str = '{'..v[1][1]..','..v[1][2]..','..v[1][3]..'}'
		lume.trace('{'..str..','..str..','..str..'},')

	end

end

return M
