Player = {}

Player.IDLE         = 0
Player.GO_ZAVOD     = 1
Player.PICKING      = 2
Player.GO_SKLAD     = 3
Player.DROPPING     = 4
Player.NEXT_TASK    = 5
Player.NOT_FOOD     = 6
Player.NEXT_ZAVOD   = 7
Player.GO_TRASH     = 8
Player.GO_RELAX     = 9
Player.GO_START     = 10
Player.GO_SLEEP     = 11
Player.GO_FISH      = 12

function Player:new(vX, vY, vZ)

    
    local private = {}
        private.examplePrivate = 1

    
    local this = {}
    this.id                 = ""
    this.is_bot             = false
    this.pos                = vmath.vector3(vX, vY, 0)
    this.posLast            = vmath.vector3(vX, vY, 0)
    this.velocity           = vmath.vector3(0, 0, 0)
    this.isFlip             = false
    this.isCollision        = false

    this.isAlive            = true
    this.isReadyBuy         = false
    this.inputAllowed       = true
    this.isUpdateMovement   = false
    this.isFollowPath       = false
    this.isNeedShowBasket   = false
    this.isHaveBasket       = false
    this.isWaitFood         = false
    this.isInQueue          = false
    this.isCollecting       = false
    this.allowCollect       = true
    this.allowDrop          = true
    this.isSkladPlace       = false
    this.isExitPlace        = false
    this.isSleeping         = false
    this.foodSklad          = nil
    this.isAlertSent        = false
    this.isOnDust           = true
    this.effectStep         = nil
    this.timerManagerHi     = nil

    this.sensitivity        = 1
    this.speed              = 360
    this.oldSpeed           = 360
    this.radius             = 10
    this.dustEffectTick     = 0
    this.dustEffectMax      = 8

    this.roleType           = 0
    this.stageAction        = ACTION_IDLE
    this.brainState         = 0
    this.tickWait           = 0
    this.numPlaceBox        = 0
    this.numPlaceOffset     = 0

    this.stamina            = 0
    this.stamina_max        = 6
    this.maxFood            = 12
    this.listCollectedFood  = {}
    this.allowWorkPlaces    = {}

    function this:getValue()
        return private.examplePrivate
    end

    function this:init(vValue, vRole)
        this.id = vValue
        this.linkBody = gameState.players[vValue]

        msg.post(this.view, "initBody", { num = vValue })
        msg.post(this.view, "randomCursor", { value = math.random()} )
        msg.post(this.view, "playAnim", { name = "idle1", loop = true} )

        this.roleType = vRole

        if this.is_bot then
            this.speed = 36*4

            if (this.roleType == ROLE_STOCKMAN) then
                this.speed = 36*4
            elseif (this.roleType == ROLE_MANAGER) then
                this.speed = 36*7
            end

            this.oldSpeed = this.speed

        end

        this.dustEffectMax = utils.round((360/this.speed)*8)
        

        this.stamina = this.stamina_max

    end

    function this:setMaxFood(vIsDisableText)
        this.maxFood = 12

        msg.post(this.view, "setOptions", {
            maxFood = this.maxFood,
            disableText = vIsDisableText
        })
        
    end

    function this:setOptions(vData)
        if vData.maxFood then
            this.maxFood = vData.maxFood

            if this.maxFood > 6 then
                this.maxFood = 6
            end

            msg.post(this.view, "setOptions", {
                maxFood = this.maxFood
            })
        end

        if vData.speed then
            
            this.speed = 36*vData.speed
            this.oldSpeed = this.speed
        end

        if vData.stamina_max then
            this.stamina_max = vData.stamina_max
            this.stamina = this.stamina_max
        end

    end

    function this:setBoostSpeed(vBool, vSpeed)
        if vBool then
            local value_speed = vSpeed or 9
            this.speed = 36 * value_speed
            this.stamina = this.stamina_max

            if this.brainState == Player.GO_SLEEP then
                this.brainState = Player.IDLE
                this.stageAction = ACTION_IDLE
            end
        else
            this.speed = this.oldSpeed
        end

        msg.post(this.view, "setVisibleBoost", { bool = vBool} )

    end

    function this:updateVisible(vBool)
        this.isAlive = vBool
        msg.post(this.view, "updateVisible", { value = vBool} )

        if ((this.roleType == ROLE_STOCKMAN) or (this.roleType == ROLE_MANAGER)) and (gameState.isBoostWorkers) then
            this:setBoostSpeed(true)
        end

    end

    function this:showEffectExit()
        addEffect("top", "effect_exit", vmath.vector3(this.pos.x, this.pos.y + 40, DEEP_EFFECT))
    end

    function this:updateSkin(vSkin, vHat, vSkipClearFood)
        msg.post(this.view, "updateView", { skin = vSkin, isSkipClearFood = vSkipClearFood} )
        

    end

    function this:updateHat(vIdHat)
        if (vIdHat > 0) then
            local selectedHat = 0
            selectedHat = vIdHat

            msg.post(this.view, "updateView", {hat = "hat"..selectedHat})
        else
            msg.post(this.view, "updateView", {hat = "hat0"})
        end

    end

    function this:updateMovement(vBool, vIsNeedFlip)
        this.isUpdateMovement = vBool

        if vIsNeedFlip then
            msg.post(this.view, "setFlip", {isFlip = false})
        end

    end

    function this:updateAnimation(vAnimation, vLoop)
        

    end

    
    
    
    function this:applyMoveInput(vInput, vIsMobileJoystick)
        if not this.inputAllowed then
            return
        end

        this.velocity.x = vInput.x
        this.velocity.y = vInput.y

        local len_vel = vmath.length(this.velocity)

        if (len_vel == 0) then
            this.dustEffectTick = 0
        end

        if (len_vel > 0) then
            if vIsMobileJoystick then
                this.sensitivity = len_vel

                this.sensitivity = lume.lerp(this.sensitivity, 1, 0.3)
                

                if this.sensitivity > 0.95 then
                    this.sensitivity = 1
                end

                if this.sensitivity < 0.25 then
                    this.sensitivity = 0.25
                end

                
            end

            local futurePoint = vmath.vector3(0,0,0)
            futurePoint = this.pos + this.velocity * 8

            if futurePoint.x > gameState.limitMoveX.max then
                this.pos.x = gameState.limitMoveX.max
                this.velocity.x = 0
            elseif futurePoint.x < gameState.limitMoveX.min then
                this.pos.x = gameState.limitMoveX.min
                this.velocity.x = 0
            end

            if futurePoint.y > gameState.limitMoveY.max then
                this.pos.y = gameState.limitMoveY.max
                this.velocity.y = 0
            elseif futurePoint.y < gameState.limitMoveY.min then
                this.pos.y = gameState.limitMoveY.min
                this.velocity.y = 0
            end

        end

    end

    
    function this:checkCollision(vPoint, vRadius)
        local isCollision = false
        local nearPoint = nil
        local dist = 0

        for j,other in pairs(gameState.listObstacles) do
            dist = lume.distance(vPoint.x, vPoint.y, other.x, other.y, true)

            if (dist < 90000) and (not other.isDisable) then
                if other.radius then
                    if (utils.doCirclesOverlap({
                        x = vPoint.x,
                        y = vPoint.y,
                        radius = vRadius
                    }, other)) then
                        isCollision = true
                    end
                else
                    if (utils.pointInPolygon(vPoint, {other.a,other.b,other.c,other.d})) then
                        isCollision = true
                        nearPoint = utils.nearPointPolygon4V(vPoint, other)
                    end
                end
            end
        end

        return isCollision, nearPoint
    end

    function this:updatePosition(vPos)
        this.pos.x = vPos.x
        this.pos.y = vPos.y

    end

    function this:followPath(vPath)
        this.inputAllowed = false
        this.isFollowPath = true
        this.sensitivity = 1

        this.wayPoints = vPath
        this.wayIndex = 2
        this.maxIndex = #vPath
        this.followingPoint = vmath.vector3(0, 0, 0)

        local wPoint = this.wayPoints[this.wayIndex]
        this.followingPoint = gameState:getPosFromTile(wPoint.x, wPoint.y)

    end

    function this:updateFollowing()
        local dX = this.pos.x - this.followingPoint.x
        local dY = this.pos.y - this.followingPoint.y
        local angle = math.atan2(dY, dX)
        local distance =  dX*dX + dY*dY

        if (distance < 20000) and (this.wayIndex == this.maxIndex) then
            this:checkFollowingPlace()
        end

        if distance > 100 then
            this.velocity.x = 0
            this.velocity.y = 0

            if math.abs(dX) > 5 then
                if dX > 0 then
                    this.velocity.x = -1
                elseif dX < 0 then
                    this.velocity.x = 1
                end
            end
            if math.abs(dY) > 5 then
                if dY > 0 then
                    this.velocity.y = -1
                elseif dY < 0 then
                    this.velocity.y = 1
                end
            end
        else

            if this.wayIndex == this.maxIndex then
                this.velocity.x = 0
                this.velocity.y = 0
                this:finishFollowing()

            else
                this.wayIndex = this.wayIndex + 1
                local wPoint = this.wayPoints[this.wayIndex]
                this.followingPoint = gameState:getPosFromTile(wPoint.x, wPoint.y)
            end
        end

    end

    function this:checkFollowingPlace()
        if this.isSkladPlace then
            if (this.numPlaceBox > 0) then
                local infoPlace = nil

                if this.roleType == ROLE_ROWDY then
                    infoPlace = gameState:getPlaceOffsetHooligan(this.numPlaceBox)
                else
                    local isBuyer = this.roleType == ROLE_BUYER
                    infoPlace = gameState:getPlaceOffset(this.numPlaceBox, isBuyer)
                end

                if infoPlace then
                    this.followingPoint = infoPlace.pos
                    this.numPlaceOffset = infoPlace.r
                end
            else
                lume.trace('[ERROR] this.numPlaceBox nil, go to exit')
                this.stageAction = ACTION_EXIT
                gameState:followPlace(this.id, 'exit')
                msg.post(this.view, "hideCloud")

            end

            this.isSkladPlace = false

            if (this.numPlaceBox == gameState.NUMPLACE_CAHSBOX) and (not this.isInQueue) then
                gameState:addQueueCashbox(this.id)
                this.isInQueue = true
            end

        elseif this.isExitPlace then
            this.isExitPlace = false
            this.followingPoint = gameState:getExitPoint()

        elseif this.isDancePlace then
            this.followingPoint = gameState:getDancefloorPoint(this.dancePoint)

        end
    end

    function this:updateDustEffect(dX)
        if this.dustEffectTick <= 0 then
            if gameState.isHaveWater then
                if (global.numMarket == 4) then
                    this.isOnDust = not gameState:checkWater(this.pos)
                    this.effectStep = 'water'
                elseif (global.numMarket == 102) then
                    this.isOnDust = not gameState:checkSnow(this.pos)
                    this.effectStep = 'snow'
                end
            end

            this:addDustEffect(dX < 0)

            this.dustEffectTick = this.dustEffectMax
        else
            this.dustEffectTick = this.dustEffectTick - 1
        end
    end

    function this:update(dt)
        if this.isAlive then
            if this.isUpdateMovement then
            if this.isFollowPath then
                this:updateFollowing(dt)
            end

            this.posLast.x = this.pos.x
            this.posLast.y = this.pos.y

            if vmath.length(this.velocity) > 0 then
                this.isCollision = false
                local dX = -this.velocity.x
                local dY = -this.velocity.y
                local angle = math.atan2(dY, dX)
                local value = this.speed * this.sensitivity * dt

                if (this.roleType == ROLE_WORKER) and (global.isCheckCollision) then
                    local dist = 0
                    local ball = {center = vmath.vector3(this.pos.x, this.pos.y, 0), radius = 20}

                    for j,other in pairs(gameState.listObstacles) do
                        dist = lume.distance(this.pos.x, this.pos.y, other.x, other.y, true)

                        if (dist < 90000) and (not other.isDisable) then
                            

                            local isEdge = false

                            for i, v in ipairs(other.lines) do
                                local b, p = trig.isLineIntersectingCircle(ball, v)
                                if (b) then
                                    isEdge = this.isCollision
                                    this.isCollision = true
                                    angle = lume.angle(this.pos.x, this.pos.y, p.x, p.y)
                                end
                            end

                            if isEdge then
                                angle = lume.angle(this.pos.x, this.pos.y, other.mid.x, other.mid.y)
                                value = value * 1.2
                            end
                        end

                    end

                    for i, v in ipairs(gameState.listLines) do
                        dist = lume.distance(this.pos.x, this.pos.y, v.mid.x, v.mid.y, true)

                        if (dist < 45000) then 
                            local b, p = trig.isLineIntersectingCircle(ball, v)
                            if (b) then
                                this.isCollision = true
                                angle = lume.angle(this.pos.x, this.pos.y, p.x, p.y)
                            end
                        end
                    end
                end

                this.pos.x = this.pos.x - value * math.cos(angle)
                this.pos.y = this.pos.y - value * math.sin(angle)
                this:updateDustEffect(dX)

                if (not this.isCollision) and (this.pos.x ~= this.posLast.x) then
                    this.isFlip = this.pos.x > this.posLast.x
                end

            end
            end

            
            
    		
    		
    		

            gameState:updateLogicCollect(this.id, this.allowWorkPlaces)
            gameState:updateLogicBuy(this.id, this.roleType)

            if (this.isSleeping) then
                local dist = lume.distance(this.pos.x, this.pos.y, gameState.ourPlayer.pos.x, gameState.ourPlayer.pos.y, true)
                local dist2 = lume.distance(this.pos.x, this.pos.y, gameState.dodikManager.pos.x, gameState.dodikManager.pos.y, true)

                if (dist < 4000) or (dist2 < 4000) then
                    this:wakeUp()
                end
            end
        end

    end

    

    function this:initAction()
        this:updateAction(ACTION_IDLE)

        this.inputAllowed = false
        this.isFollowPath = true

        this.followingPoint = gameState.posStart

    end

    function this:goPacking(vCountFood, vTime)
        this:updateAction(ACTION_PACKING)

        timer.delay(vTime, false, function()
            this:updateAction(ACTION_EXIT)
            this:playAudio('happy')
        end)

    end

    function this:updateAction(vAction)
        this.stageAction = vAction

        if this.stageAction == ACTION_IDLE then
            msg.post(this.view, "updateAction", {action = vAction})

        elseif this.stageAction == ACTION_PICKING then
            this:updateWishFood()

        elseif this.stageAction == ACTION_GO_PAY then
            msg.post(this.view, "updateAction", {action = vAction})

        elseif this.stageAction == ACTION_PACKING then
            msg.post(this.view, "updateAction", {action = vAction})

        elseif this.stageAction == ACTION_EXIT then
            msg.post(this.view, "updateAction", {action = vAction})

            if (this.numPlaceOffset > 0) then
                gameState:clearOffsetPlace(this.numPlaceBox, this.numPlaceOffset)
            end

            if #this.listCollectedFood > 0 then
                this.listCollectedFood = {}
                msg.post(this.view, "food_clear")
            end

            this.isInQueue = false

            gameState:followPlace(this.id, 'exit')

            gameState:shiftQueueCashbox()

        elseif this.stageAction == ACTION_SLEEP then
            msg.post(this.view, "updateAction", {action = vAction})

        elseif this.stageAction == ACTION_WAKEUP then
            msg.post(this.view, "updateAction", {action = vAction})

        elseif this.stageAction == ACTION_CRAZY then
            msg.post(this.view, "updateAction", {action = vAction})

        end

    end

    function this:startDance()
        local r = math.random(3)
        msg.post(this.view, "playAnim", { name = "dance"..r, loop = true} )

        timer.delay(2.5, false, function()
            this:updateMovement(true)

            if this.roleType == ROLE_DANCER then
                gameState:followPlace(this.id, 'exit')
                this.stageAction = ACTION_EXIT
            else
                this.inputAllowed = true
            end

        end)

    end

    function this:finishFollowing()
        if this.isDancePlace then
            this.isFollowPath = false
            this.isDancePlace = false
            this.isWaitDance = true
            this:updateMovement(false)

            this:updateAction(ACTION_IDLE)

            gameState:checkCelebrating()
            return
        end

        this.isFollowPath = false
        this.inputAllowed = true
        this.isSkladPlace = false
        this.isExitPlace = false

        if this.stageAction == ACTION_IDLE then
            this:updateBot()

            if (this.roleType == ROLE_BUYER) and (this.brainState == 1) then
                this:updateBot()
            end

            if (this.roleType == ROLE_MANAGER) then
                if (this.brainState == 3) then
                    this:prepareManager()
                elseif (this.brainState == 10) then
                    this.brainState = 0
                end
            end

        elseif this.stageAction == ACTION_PICKING then
            if this.isNeedShowBasket then
                this:showBasket()
            end

        elseif this.stageAction == ACTION_GO_PAY then
            
            
            
            

        elseif this.stageAction == ACTION_EXIT then
            this:updateVisible(false)
			this:showEffectExit()

            this:setBoostSpeed(false)

            if (this.roleType == ROLE_MANAGER) then
                timer.delay(TIME_MANAGER_CD, false, function()
                    gameState:addManager()
                end)
            end

            if (this.roleType == ROLE_DELIVERYBOY) then
                gameState:hideDeliveryBoy()
            end

            if (this.id == 'id_punch') then
                gameState:hideBuyerPunch()
            end

        elseif this.stageAction == ACTION_SLEEP then
            this:goSleep()

        end

        if this.roleType == ROLE_CASHIER then
            if this.brainState == 2 then
                msg.post(this.view, "updateFlip", { value = true} )
            end
        end

        if (this.roleType == ROLE_DELIVERYBOY) then
            
            if (this.brainState == 10) then
                this:followPointPlace('deliveryboy')
                this.brainState = 1
            end

        end

    end

    function this:goSleep()
        this.isFollowPath = false
        this.isSleeping = true
        this.velocity.x = 0
        this.velocity.y = 0
        this:updateAction(ACTION_SLEEP)
        this:updateMovement(false)

        gameState:updateAlert(true, {t = this.id})

        gameState:showHint(true, 1, 'arrow', this.pos, 230)

    end

    function this:startHooligan()
        
        this.brainState = Player.IDLE
        this.speed = 36*4

    end

    function this:goHooliganAway()
        if (this.stageAction == ACTION_EXIT) or (not gameState.isAllowHooligan) then
            return
        end

        this.speed = 36*7
        this.brainState = 3
        this:updateMovement(true)
        this.stageAction = ACTION_EXIT
        gameState:followPlace(this.id, 'exit')

        msg.post(this.view, "smile_exit")

        addEffect("top", "effect_broom", vmath.vector3(this.pos.x + 5, this.pos.y + 60, DEEP_CLOUD))
        playSound("sfx_broom")

        gameState:updateAlert(false, {t = this.foodSklad})
        gameState:kickHooligan()

    end

    function this:wakeUp()
        this.isSleeping = false

        addEffect("top", "effect_alarm", vmath.vector3(this.pos.x + 35, this.pos.y + 100, DEEP_CLOUD))
        playSound("sfx_alarm")

        timer.delay(0.5, false, function()
            this:updateAction(ACTION_WAKEUP)
            this.stamina = this.stamina_max
        end)

        timer.delay(1.5, false, function()
            this:updateMovement(true)
            this.brainState = Player.IDLE
            this:updateAction(ACTION_IDLE)
            
        end)

        gameState:finishMainAction('wakeup')

        gameState:updateAlert(false, {t = this.id})

        gameState:showHint(false, 1, 'arrow')

    end

    function this:workCashier()
        

        if this.isFollowPath or (this.brainState < 2) then
            return
        end

        this:updateMovement(false)
        msg.post(this.view, "playAnim", { name = "diler1", loop = false} )
        
        
    end

    function this:checkCashier()
        if this.isFollowPath or (this.brainState < 2) then
            return false
        end

        return true
    end

    function this:prepareManager()
        if (not gameState.isBoostManager) then
            this:updateMovement(false)
            msg.post(this.view, "updateFlip", { value = false} )
            msg.post(this.view, "playAnim", { name = "idle5", loop = true} )

            this.timerManagerHi = timer.delay(4.0, true, function()
                msg.post(this.view, "playAnim", { name = "hi2", loop = false} )
            end)

            gameState:activateIndicatorManager()
        end


    end

    function this:activateManager()
        this:updateMovement(true)

        if this.timerManagerHi then
            local result = timer.get_info(this.timerManagerHi)

            if result then
                timer.cancel(this.timerManagerHi)
            end
        end

    end

    function this:exitManager()
        this.brainState = 4

    end

    

    function this:initWishFood(vData)
        this.wishFood = {
            data        = vData,
            tick        = 0,
            tickMax     = #vData,
            type        = 0,
            countHave   = 0,
            countNeed   = 0,
            costFood    = 0
        }

        local countFood = 0
        local costFood  = 0

        for k,v in pairs(this.wishFood.data) do
            countFood = countFood + v.count
            costFood = costFood + global.priceFood[v.type]*v.count
        end

        this.wishFood.costFood = costFood

        

        this.brainState = 1

        if countFood > 4 then
            this.isNeedShowBasket = true
            this.brainState = Player.IDLE
        end

        msg.post(this.view, "updateSuffix", {
            tickMax = countFood
        })

        this.numPlaceOffset = 0
        this.numPlaceBox    = 0
        this.isHaveBasket   = false
        this.isWaitFood     = false
        this.isInQueue      = false

    end

    function this:updateWishFood()
        if (this.wishFood == nil) then
            lume.trace('[ WARNING ] monkey', this.id, 'wishFood is nil')
            return
        end
        
        if this.wishFood.tick == this.wishFood.tickMax then
            this:updateAction(ACTION_GO_PAY)

        else
            this.wishFood.tick = this.wishFood.tick + 1

            this.wishFood.type = this.wishFood.data[this.wishFood.tick].type
            this.wishFood.countNeed = this.wishFood.data[this.wishFood.tick].count
            this.wishFood.countHave = 0

            msg.post(this.view, "updateAction", {
                action = this.stageAction,
                list = this.wishFood.data[this.wishFood.tick]
            })

            this.isWaitFood = false

        end

    end

    function this:updatePicking(vRole)
        this.wishFood.countHave = 0

        for k,v in pairs(this.listCollectedFood) do
            if v == this.wishFood.type then
                this.wishFood.countHave = this.wishFood.countHave + 1
            end
        end

        if vRole == ROLE_BUYER then
            msg.post(this.view, "updateWishList", {
                count1 = this.wishFood.countHave,
                count2 = this.wishFood.countNeed
            })

            if this.wishFood.countHave >= this.wishFood.countNeed then
                this:updateWishFood()

                if this.wishFood.countHave > this.wishFood.countNeed then
                    lume.trace('BUG with collecting')
                end
            end

        elseif vRole == ROLE_STOCKMAN then
            if this.wishFood.countHave == this.wishFood.countNeed then
                this:finishPicking()
            end

        end

    end

    function this:finishPicking()
        if (this.roleType == ROLE_STOCKMAN) and (this.brainState > 0) then
            this.allowCollect = false
            this.brainState = Player.GO_SKLAD
            this:updateBot()
        end

    end

    function this:finishDrop()
        if (this.roleType == ROLE_STOCKMAN) and (this.brainState > 0) then
            this.allowCollect = false
            this.brainState = Player.NEXT_TASK
            this:updateBot()
        end

    end

    function this:showBasket()
        this.isNeedShowBasket = false
        this.isHaveBasket = true
        msg.post(this.view, "showBasket")

    end

    
    
    

    function this:updateBot()
        if this.isAlive and (not this.isFollowPath) then
        
        if this.roleType == ROLE_BUYER then
            if this.brainState == Player.IDLE then
                this.brainState = 1

                gameState:followPlace(this.id, 'basket')

            elseif this.brainState == 1 then
                if this.stageAction == ACTION_PICKING then
                    if not this.isWaitFood then
                        if (this.numPlaceOffset > 0) then
                            gameState:clearOffsetPlace(this.numPlaceBox, this.numPlaceOffset)
                        end

                        if this.wishFood then
                            gameState:followPlace(this.id, global.foodName[this.wishFood.type])
                        else
                            lume.trace('[ WARNING ] monkey', this.id, 'wishFood is nil')
                        end

                        this.isWaitFood = true

                    end

                elseif this.stageAction == ACTION_GO_PAY then
                    if (this.numPlaceOffset > 0) then
                        gameState:clearOffsetPlace(this.numPlaceBox, this.numPlaceOffset)
                    end

                    this:updateAction(ACTION_GO_PAY)
                    gameState:followPlace(this.id, 'cashbox')
                    this.brainState = 2

                end

            end

            if this.stageAction == ACTION_IDLE then
                this.brainState = 1
                this:updateAction(ACTION_PICKING)

            end

        
        elseif this.roleType == ROLE_ROWDY then
            if this.brainState == 0 then
                this.brainState = 1

                local place = gameState:getAvailableSklad()
                gameState:followPlace(this.id, place)
                this.foodSklad = 'f_'..place
                this.isAlertSent = false

            elseif this.brainState == 1 then
                if this.allowDrop then
                    this.brainState = 2
                    this.tickWait = 3

                    gameState.isAllowHooligan = true
                    this:updateAction(ACTION_CRAZY)
                    this:updateMovement(false)

                    local r = math.random(2)
                    msg.post(this.view, "playAnim", { name = "crazy"..r, loop = true} )

                    if (not this.isAlertSent) then
                        this.isAlertSent = true
                        gameState:updateAlert(true, {t = this.foodSklad, id = this.numPlaceBox})
                    end
                end

            elseif this.brainState == 2 then
                if this.allowDrop then
                    this.tickWait = this.tickWait - 1

                    local count = gameState:getSkladCount(this.numPlaceBox)

                    if (this.tickWait <= 0) and (count > 0) then
                        this.brainState = 1
                        msg.post(this.view, "playAnim", { name = "crazy3", loop = false} )

                        this.allowDrop = false

                        timer.delay(1.0, false, function()
                            if (this.stageAction ~= ACTION_EXIT) then
                                gameState:throwFromPlace(this.numPlaceBox)
                            end
                            this.allowDrop = true
                        end)
                    end
                end

            end

        
        elseif this.roleType == ROLE_CASHIER then
            if this.brainState == Player.IDLE then
                this.brainState = 1
                gameState:followPlace(this.id, 'cashier')

            elseif this.brainState == 1 then
                this.brainState = 2
                this:followPointPlace('cashier')

            end

        
        elseif this.roleType == ROLE_STOCKMAN then
            

            
            
            
            if this.brainState == Player.IDLE then
                this.allowDrop = false
                this.allowCollect = false

                if (this.wishFood) then
                if (#this.wishFood.goalPlaces == 0) then
                    return
                end

                this:getStockmanGoal(this.wishFood.goalPlaces[this.wishFood.swift])

                local numPlace = this.wishFood.goalPlaces[this.wishFood.swift]
                local isActiveGoal = gameState.listPlaceBoxes[numPlace].isActive
                

                if isActiveGoal then
                local countSkladNeed = gameState:getSkladInfo(this.wishFood.idPlace, this.maxFood)
                

                if countSkladNeed == 0 then
                    
                    local allTaskCompleted = true

                    for i=1,this.wishFood.maxSwift do
                        countSkladNeed = gameState:getSkladInfo(this.wishFood.goalPlaces[i], this.maxFood)
                        if countSkladNeed > 0 then
                            allTaskCompleted = false
                        end
                    end

                    if allTaskCompleted then
                        this.brainState = Player.GO_RELAX
                        gameState:followPlace(this.id, 'relax_place'..this.wishFood.idMan)
                    end

                else
                    local isActiveZavod = gameState.listPlaceBoxes[this.wishFood.places_id[1]].isActive

                    

                    if isActiveZavod then
                    this.brainState = Player.GO_ZAVOD

                    gameState:followPlace(this.id, this.wishFood.zavodName)
                    this.wishFood.countNeed = countSkladNeed
                    this.wishFood.tick = 1

                    if (this.wishFood.type == 21) or (this.wishFood.type == 22) then
                        this.brainState = Player.GO_FISH
                        this.tickWait = 10
                    end
                    end

                end
                end

                this.wishFood.swift = this.wishFood.swift + 1

                if this.wishFood.swift > this.wishFood.maxSwift then
                    this.wishFood.swift = 1
                end
                end

            
            elseif this.brainState == Player.GO_ZAVOD then
                local places_id = this.wishFood.places_id

                if (#places_id == 0) then
                    return
                end

                local num = places_id[this.wishFood.tick]

                local posX = gameState.listPlaceBoxes[num].x
                local posY = gameState.listPlaceBoxes[num].y

                posX = posX + this.wishFood.offsetX
                posY = posY - this.wishFood.offsetY

                this.allowCollect = true
                this.inputAllowed = false
                this.isFollowPath = true
                this.followingPoint = vmath.vector3(posX,posY,0)

                local havePlace2 = (#places_id >= 2) and gameState.listPlaceBoxes[places_id[2]].isActive
                local havePlace3 = (#places_id >= 3) and gameState.listPlaceBoxes[places_id[3]].isActive
                local havePlace4 = (#places_id >= 4) and gameState.listPlaceBoxes[places_id[4]].isActive
                local havePlace5 = (#places_id >= 5) and gameState.listPlaceBoxes[places_id[5]].isActive
                local havePlace6 = (#places_id >= 6) and gameState.listPlaceBoxes[places_id[6]].isActive
                local havePlace7 = (#places_id >= 7) and gameState.listPlaceBoxes[places_id[7]].isActive
                local havePlace8 = (#places_id >= 8) and gameState.listPlaceBoxes[places_id[8]].isActive
                local havePlace9 = (#places_id >= 9) and gameState.listPlaceBoxes[places_id[9]].isActive
                local havePlace10 = (#places_id >= 10) and gameState.listPlaceBoxes[places_id[10]].isActive
                local havePlace11 = (#places_id >= 11) and gameState.listPlaceBoxes[places_id[11]].isActive
                local havePlace12 = (#places_id >= 12) and gameState.listPlaceBoxes[places_id[12]].isActive

                if (this.wishFood.tick == 1) then
                    if havePlace2 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 2
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 2) then
                    if havePlace3 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 3
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 3) then
                    if havePlace4 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 4
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 4) then
                    if havePlace5 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 5
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 5) then
                    if havePlace6 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 6
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 6) then
                    if havePlace7 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 7
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 7) then
                    if havePlace8 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 8
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 8) then
                    if havePlace9 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 9
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 9) then
                    if havePlace10 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 10
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 10) then
                    if havePlace11 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 11
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 11) then
                    if havePlace12 then
                        this.brainState = Player.NEXT_ZAVOD
                        this.wishFood.tick = 12
                    else
                        this.brainState = Player.PICKING
                        this.tickWait = 2
                    end
                elseif (this.wishFood.tick == 12) then
                    this.brainState = Player.PICKING
                    this.tickWait = 2
                end

            
            elseif this.brainState == Player.PICKING then
                

                this.tickWait = this.tickWait - 1

                

                if (this.tickWait < 0) then
                    if (this.wishFood.countHave > 0) then
                        this:finishPicking()
                    else
                        this.allowCollect = false
                        this.brainState = Player.NOT_FOOD
                    end
                end

            
            elseif this.brainState == Player.GO_SKLAD then
                
                gameState:followPlace(this.id, this.wishFood.skladName)
                this.brainState = Player.DROPPING
                this.tickWait = 3

            
            elseif this.brainState == Player.DROPPING then
                this.allowDrop = true
                

                this.tickWait = this.tickWait - 1
                if (this.tickWait < 0) then
                    gameState:followPlace(this.id, 'trash')
                    this.brainState = Player.GO_TRASH
                end

            
            elseif this.brainState == Player.NEXT_TASK then
                this.allowDrop = false

                if not gameState.isBoostWorkers then
                    this.stamina = this.stamina - 1
                end

                if (this.stamina <= 0) then
                    this.brainState = Player.GO_SLEEP
                    this.stageAction = ACTION_SLEEP
                    gameState:followPlace(this.id, 'relax_place'..this.wishFood.idMan)
                    return
                end

                this.brainState = Player.IDLE

            
            elseif this.brainState == Player.GO_SLEEP then
                

            elseif this.brainState == Player.GO_RELAX then
                this.allowDrop = false
                this.brainState = Player.IDLE

            
            elseif this.brainState == Player.NOT_FOOD then
                this.brainState = Player.IDLE

            
            elseif this.brainState == Player.NEXT_ZAVOD then
                this.brainState = Player.GO_ZAVOD

            
            elseif this.brainState == Player.GO_TRASH then
                this:followPointPlace('trash')

            elseif this.brainState == Player.GO_FISH then
                this.allowCollect = true
                this.inputAllowed = false

                this:checkFishCatch()

            elseif this.brainState == Player.GO_START then
                this.allowDrop = false
                this.allowCollect = false
                gameState:followPlace(this.id, 'relax_place'..this.wishFood.idMan)
                this.brainState = Player.GO_RELAX

            end
            

        
        elseif this.roleType == ROLE_MANAGER then
            if this.brainState == 0 then
                local placeName = gameState:checkAlertPlaces()

                if placeName and gameState.isBoostManager then
                    gameState:followPlace(this.id, placeName)

                    if placeName == 'hooligan' then
                        this.brainState = 2
                    else
                        this.brainState = 1
                    end
                else
                    gameState:followPlace(this.id, 'relax_place_m')
                    this.brainState = 3
                end

            elseif this.brainState == 1 then
                this.brainState = 0

            elseif this.brainState == 2 then
                if gameState.dodikHooligan.stageAction == ACTION_CRAZY then
                    this:followPointPlace('hooligan')
                end

                this.brainState = 1

            elseif this.brainState == 3 then
                this:followPointPlace('manager')
                this.brainState = 0

            elseif this.brainState == 4 then
                this.stageAction = ACTION_EXIT
                gameState:followPlace(this.id, 'exit')

            end

        elseif this.roleType == ROLE_DANCER then
            if this.brainState == 0 then
                this:followPointPlace('start')

                this.brainState = 1
            
            elseif this.brainState == 1 then
                gameState:followPlace(this.id, 'dancefloor')
                this.isDancePlace = true
                this.brainState = 2

            end

        elseif this.roleType == ROLE_DELIVERYBOY then
            if this.brainState == 1 then
                msg.post(this.view, "updateFlip", { value = false} )
                gameState:updateDeliveryBoy(this.brainState)		

                this.brainState = 2

            end
            
        end
        
        end

    end

    

    function this:setStockman(vIdStockman, vGoalPlaces)
        this.wishFood = {
            idMan       = 0,
            idPlace     = 0,
            places_id   = {},
            type        = 0,
            countHave   = 0,
            countNeed   = 0,
            tick        = 0,
            offsetY     = 1,
            swift       = 1,
            maxSwift    = 1,
            goalPlaces  = nil,
            zavod       = nil
        }

        this.brainState = Player.GO_START

        this.wishFood.goalPlaces = vGoalPlaces
        this.wishFood.maxSwift = #vGoalPlaces
        this.wishFood.idMan = vIdStockman

    end

    function this:getStockmanGoal(vPlaceId)
        

        local data = gameState:getDataGoalPlace(vPlaceId)
        this.wishFood.type = data.type
        this.wishFood.offsetX = data.offsetX
        this.wishFood.offsetY = data.offsetY
        this.wishFood.places_id = data.places_id
        this.wishFood.skladName = data.skladName
        this.wishFood.zavodName = data.zavodName

        this.wishFood.idPlace = vPlaceId

        this.wishFood.countHave = 0
        this.wishFood.countNeed = 0
        this.wishFood.tick = 0

    end

    function this:followPointPlace(vNamePlace)
        this.inputAllowed = false
        this.isFollowPath = true

        local point = vmath.vector3(0,0,0)

        if vNamePlace == 'start' then
            point.x = gameState.posStart.x
            point.y = gameState.posStart.y
        elseif vNamePlace == 'cashier' then
            point.x = gameState.placeCashBox.x - 85
            point.y = gameState.placeCashBox.y - 4
        elseif vNamePlace == 'trash' then
            point.x = gameState.posTrash.x
            point.y = gameState.posTrash.y - 30
        elseif vNamePlace == 'hooligan' then
            point.x = gameState.dodikHooligan.pos.x
            point.y = gameState.dodikHooligan.pos.y
        elseif vNamePlace == 'manager' then
            point.x = gameState.posManager.x
            point.y = gameState.posManager.y
        elseif vNamePlace == 'deliveryboy' then
            point.x = gameState.posDeliveryBoy.x
            point.y = gameState.posDeliveryBoy.y
        end

        this.followingPoint = point

    end

    function this:followPointForce(point)
        this.inputAllowed = false
        this.isFollowPath = true
        this.followingPoint = point

    end

    function this:checkFishCatch()
        

        this:updateCatchFish()

        if (this.tickWait > 0) then
            this.tickWait = this.tickWait - 1
        else
            if (this.wishFood.tick == 1) then
                this.wishFood.tick = 2
                this.tickWait = 10
            elseif (this.wishFood.tick == 2) then
                this.wishFood.tick = 3
                this.tickWait = 10
            elseif (this.wishFood.tick == 3) then
                if (this.wishFood.countHave == 0) then
                    this.wishFood.tick = 1
                    local places_id = this.wishFood.places_id
                    local num = places_id[this.wishFood.tick]

                    if (gameState.listPlaceBoxes[num].countFood == 0) then
                        this.allowCollect = false
                        this.brainState = Player.NOT_FOOD
                    end
                else
                    this.brainState = Player.PICKING
                    this.tickWait = 0
                end
            end

        end

    end

    function this:updateCatchFish()
        if (this.wishFood.countHave < this.wishFood.countNeed) then
            local places_id = this.wishFood.places_id
            local num = places_id[this.wishFood.tick]

            if (gameState.listPlaceBoxes[num].countFood == 1) then
                local posX = gameState.listPlaceBoxes[num].x
                local posY = gameState.listPlaceBoxes[num].y
                this.followingPoint = vmath.vector3(posX,posY,0)
                this.isFollowPath = true
                
            else
                this.tickWait = 0
            end

        end
    end
    

    function this:playAudio(vTypeAction)
        if this.id == 'idMy' then
            if vTypeAction == 'stock' then
                playSound("sfx_stock"..global.selected_sfx[9])
            elseif vTypeAction == 'collect' then
                playSound("sfx_collect"..global.selected_sfx[4])
            elseif vTypeAction == 'delete' then
                playSound("sfx_delete"..global.selected_sfx[6])
            end
        end

        local distance = lume.distance(gameState.ourPlayer.pos.x, gameState.ourPlayer.pos.y, gameState.placeCashBox.x, gameState.placeCashBox.y, true)

        if distance < 200000 then
            if vTypeAction == 'payment' then
                playSound("sfx_payment")
            elseif vTypeAction == 'happy' then
                r = 2 + math.random(3)
                playSound("sfx_happy"..r)
            end
        end

    end

    
    
    
    function this:addDustEffect(vIsFlip)
        if this.isOnDust then
            addEffect("game", "effect_dust", vmath.vector3(this.pos.x, this.pos.y + 10, DEEP_DUST), vIsFlip)
        else
            if (this.effectStep == 'water') then
                addEffect("game", "effect_splash", vmath.vector3(this.pos.x, this.pos.y + 10, DEEP_DUST), vIsFlip)
            elseif (this.effectStep == 'snow') then
                addEffect("game", "effect_footprint", vmath.vector3(this.pos.x, this.pos.y + 10, DEEP_DUST), vIsFlip)
            end
        end

    end
    

    function this:showFood(vList)
        msg.post(this.view, "showFood", { list = vList} )

        

    end

    

    
    setmetatable(this,self)
    self.__index = self; return this
end
