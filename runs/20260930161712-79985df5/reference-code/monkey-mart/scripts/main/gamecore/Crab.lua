Crab = {}

function Crab:new(vX, vY)

    local this = {}

    this.pos                = vmath.vector3()
    this.posLast            = vmath.vector3()
    this.velocity           = vmath.vector3()
    this.isFlip             = false
    this.isAlive            = false
    this.isFollowPath       = false
    this.isUpdateMovement   = false
    this.isSkipCheckHide    = false
    this.isFinalTile        = false
    this.view               = nil
    this.effectStep         = nil
    this.action             = 0
    this.tickWait           = 0
    this.tickHide           = 0
    this.sensitivity        = 1
    this.speed              = 0
    this.dustEffectTick     = 0
    this.dustEffectMax      = 20
    this.DISTANCE_HIDE      = 22000
    this.DISTANCE_EXIT      = 35000
    this.DISTANCE_STEP      = 300

    this.ACTION_IDLE        = 0
    this.ACTION_RUN         = 1
    this.ACTION_WAIT        = 2
    this.ACTION_HIDE        = 3
    this.ACTION_SHOW        = 4
    this.ACTION_EXIT        = 5
    this.ACTION_DANCE       = 6

    function this:init(vId, vPos)
        this.isAlive = true
        this.isFollowPath = false
        this.isUpdateMovement = true
        this.pos = vPos
        this.speed = 36*2
        this.id = vId

        this.countStep = 0
        this:checkNextLogic()

    end

    function this:update(dt)
        if this.isAlive then
            if (this.action ~= this.ACTION_HIDE) and gameState and gameState.ourPlayer then
                local player_pos = gameState.ourPlayer.pos

                local distance = lume.distance(player_pos.x, player_pos.y, this.pos.x, this.pos.y, true)
                

                if (distance < this.DISTANCE_HIDE) and (not this.isSkipCheckHide) then
                    this:timeToHide()
                end

            end

            if this.isUpdateMovement then
                if this.isFollowPath then
                    this:updateFollowing(dt)
                end

                this.posLast.x = this.pos.x
                this.posLast.y = this.pos.y

                if vmath.length(this.velocity) > 0 then
                    local dX = -this.velocity.x
                    local dY = -this.velocity.y
                    local angle = math.atan2(dY, dX)
                    local value = this.speed * this.sensitivity * dt

                    this.pos.x = this.pos.x - value * math.cos(angle)
                    this.pos.y = this.pos.y - value * math.sin(angle)
                    this:updateDustEffect(dX)

                    if (this.pos.x ~= this.posLast.x) then
                        this.isFlip = this.pos.x > this.posLast.x
                    end

                end
            end
        end
    end

    function this:updateDustEffect(dX)
        if this.dustEffectTick <= 0 then
            if gameState.isHaveWater then
                if (global.numMarket == 4) then
                    this.isOnDust = not gameState:checkWater(this.pos)
                    this.effectStep = 'water'
                end
            end

            this:addDustEffect(dX < 0)

            this.dustEffectTick = this.dustEffectMax
        else
            this.dustEffectTick = this.dustEffectTick - 1
        end
    end

    function this:updateLogic()
        if (this.isFollowPath) then
            
            return
        end

        if (this.tickWait > 0) then
            this.tickWait = this.tickWait - 1
            
            return
        end

        
        
        
        
        
        
        
        
        
        

        if (this.action == this.ACTION_IDLE) then
            

            local sectorNum = 90 * this.sectorSelected
            local sectorSize = 90
            local p = utils.getRandomPointInSector(this.DISTANCE_STEP, this.pos, sectorSize, sectorNum, true)

            
            
            

            local isInside = gameState:checkCrabPoint(p)

            if (isInside) then
                this.action = this.ACTION_WAIT
                this.tickWait = 0
                

                
                
                

                return
            end

            local tileGoal = gameState:getTileFromPos(p.x, p.y)

            
            

            local path = gameState:followTileCrab(this.pos, tileGoal)

            if path then
                this:followPath(path)
                this.action = this.ACTION_RUN
            else
                this.action = this.ACTION_WAIT
                gameState:checkAllPlaces('crab', this.pos, this.id)
            end

            this.tickWait = math.random(0, 3)

            

        elseif (this.action == this.ACTION_HIDE) then
            local player_pos = gameState.ourPlayer.pos
            
            local distance = lume.distance(player_pos.x, player_pos.y, this.pos.x, this.pos.y, true)
            
            if (distance > this.DISTANCE_EXIT) then
                this.action = this.ACTION_SHOW
                this.tickWait = math.random(0, 3)

            else
                

                this.tickHide = this.tickHide + 1

                if (this.tickHide > 3) then
                    this.isSkipCheckHide = true
                    this.action = this.ACTION_SHOW
                    this.tickWait = 0

                    if (player_pos.x > this.pos.x) then
                        if (player_pos.y < this.pos.y) then
                            this.sectorSelected = 1
                        else
                            this.sectorSelected = 2
                        end
                    else
                        if (player_pos.y < this.pos.y) then
                            this.sectorSelected = 0
                        else
                            this.sectorSelected = 3
                        end
                    end
                end

            end

        elseif (this.action == this.ACTION_WAIT) then
            this.action = this.ACTION_IDLE

            this.sectorSelected = this.sectorSelected + 1

            if (this.sectorSelected > 3) then
                this.sectorSelected = 0
            end
        
        elseif (this.action == this.ACTION_SHOW) then
            this:timeToShow()

        elseif (this.action == this.ACTION_DANCE) then
            this.action = this.ACTION_IDLE
            this.countStep = math.random(2, 3)

        end

    end

    function this:checkNextLogic()
        this.action = this.ACTION_IDLE

        this.countStep = this.countStep - 1
        
        

        if (this.countStep <= 0) then
            this.sectorSelected = math.random(0, 3)
            this.countStep = math.random(1, 5)

            
            

            local chance_dance = 0.15
            local isDance = math.random() < chance_dance

            if (isDance) then
                this.action = this.ACTION_DANCE
                this.isUpdateMovement = false

                if (math.random() < 0.5) then
                    msg.post(this.view, "playAnim", {name = "dance_animal", loop = true})
                else
                    msg.post(this.view, "playAnim", {name = "dance2_animal", loop = true})
                end

                this.tickWait = math.random(1, 3)
            end

        end


    end

    function this:timeToHide()
        

        this.action = this.ACTION_HIDE

        this.isFollowPath = false
        this.isUpdateMovement = false

        this.tickHide = 0

        msg.post(this.view, "playAnim", {name = "hide_animal", loop = false})
        
    end

    function this:timeToShow()
        

        this.action = this.ACTION_EXIT
        msg.post(this.view, "playAnim", {name = "exit_animal", loop = false})

        timer.delay(0.5, false, function()
            this.action = this.ACTION_IDLE
            this.countStep = math.random(2, 3)
            this:updateLogic()
        end)

    end

    function this:followPath(vPath)
        this.isUpdateMovement   = true
        this.isFollowPath       = true
        this.isFinalTile        = false

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

        if (distance > 100) then
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

    end

    function this:finishFollowing()
        this.isFollowPath = false
        this.isSkipCheckHide = false

        this:checkNextLogic()

        

    end

    function this:updatePosition(vPos)
        this.pos.x = vPos.x
        this.pos.y = vPos.y

    end

     
    
    
    function this:addDustEffect(vIsFlip)
        if this.isOnDust then
            
        else
            if (this.effectStep == 'water') then
                addEffect("game", "effect_splash", vmath.vector3(this.pos.x, this.pos.y + 10, DEEP_DUST), vIsFlip)
            end
        end

    end

    
    setmetatable(this,self)
    self.__index = self; return this
end
