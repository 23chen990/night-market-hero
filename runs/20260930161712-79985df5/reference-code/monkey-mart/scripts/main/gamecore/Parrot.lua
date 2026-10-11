Parrot = {}

function Parrot:new(vX, vY)

    local this = {}

    this.pos        = vmath.vector3()
    this.view       = nil
    this.cloudFood  = nil
    this.shadow     = nil
    this.isAlive    = false
    this.isFed      = false
    this.action     = 0
    this.tickWait   = 0
    this.typeFood   = 0
    this.countFood  = 0

    function this:init()
        local cloudFood = addCloudFood(vmath.vector3(this.pos.x, this.pos.y + 100, DEEP_CLOUD))
        local shadow = addGraphic({sprite="shadow", x=this.pos.x, y=this.pos.y - 3, z=DEEP_BACKGROUND})

        this.cloudFood = cloudFood.root
        this.shadow = shadow

        msg.post(this.cloudFood, "hide")
        msg.post(this.shadow, "hide")
        msg.post(this.view, "hide")

    end

    function this:move(vPos)
        if this.action > 0 then
            return
        end

        this.pos.z = DEEP_FOOD_ANIM
        go.set_position(this.pos, this.view)

        this.action = 1

        local distance = lume.distance(this.pos.x, this.pos.y, vPos.x, vPos.y)
        local delta = utils.roundDecimal(distance/200, 2)

        if delta < 2 then
            delta = 2
        end

        local timeShow = delta
        local timeFly = timeShow - 1.0
        local offsetFlyY = 50

        local pStart = vmath.vector3()
        local pFinish = vmath.vector3()
        local pEnd = vmath.vector3()

        local isFlip = this.pos.x < vPos.x
        msg.post(this.view, "updateFlip", { value = isFlip} )

        
        msg.post(this.shadow, "show")
        msg.post(this.view, "playAnim", { name = "fly_parrot", loop = true} )

        pStart = vmath.vector3(this.pos.x, this.pos.y, DEEP_FOOD_ANIM)
        pFinish = vmath.vector3(this.pos.x, this.pos.y + offsetFlyY, DEEP_FOOD_ANIM)
        msg.post(this.view, "moveCar", {start = pStart, finish = pFinish, time = 0.5})

        
        timer.delay(0.5, false, function()
            pStart = vmath.vector3(this.pos.x, this.pos.y + offsetFlyY, DEEP_FOOD_ANIM)
            pFinish = vmath.vector3(vPos.x, vPos.y + offsetFlyY, DEEP_FOOD_ANIM)
            msg.post(this.view, "moveCar", {start = pStart, finish = pFinish, time = timeFly})

            pStart = vmath.vector3(this.pos.x, this.pos.y - 3, DEEP_BACKGROUND)
            pFinish = vmath.vector3(vPos.x, vPos.y - 3, DEEP_BACKGROUND)
            msg.post(this.shadow, "moveCar", {start = pStart, finish = pFinish, time = timeFly})
        end)

        
        timer.delay(timeFly + 0.5, false, function()
            pStart = vmath.vector3(vPos.x, vPos.y + offsetFlyY, DEEP_FOOD_ANIM)
            pFinish = vmath.vector3(vPos.x, vPos.y, DEEP_FOOD_ANIM)
            msg.post(this.view, "moveCar", {start = pStart, finish = pFinish, time = 0.5})
        end)

        timer.delay(timeShow, false, function()
            pEnd.x = vPos.x
            pEnd.y = vPos.y
            pEnd.z = gameState:getPosZ(vPos.y)

            msg.post(this.view, "playAnim", { name = "idle_animal", loop = true} )
            msg.post(this.shadow, "hide")

            this.pos.x = pEnd.x
            this.pos.y = pEnd.y
            this.pos.z = pEnd.z

            go.set_position(this.pos, this.view)

            if this.isFed then
                this:fly(false)
            else
                this:setWaitingFood(this.pos.x, this.pos.y + 100)
            end
        end)

    end

    function this:fly(vBool)
        if this.isAlive == vBool then
            return
        end

        if vBool then
            this.isAlive    = true
            this.isFed      = false
            this.action     = 0
            this.tickWait   = 0
            this.typeFood   = 0
            this.countFood  = 0

            local posStart = gameState.dataMart.posExit
            this.pos.x = posStart.x
            this.pos.y = posStart.y
            this.pos.z = gameState:getPosZ(posStart.y)
            go.set_position(this.pos, this.view)

            msg.post(this.view, "show")

            local posFly = gameState.dataMart.posParrot

            posFly.x = posFly.x + lume.random(-5, 5)*10
            this:move(posFly)

            addEffect("top", "effect_exit", vmath.vector3(this.pos.x, this.pos.y + 40, DEEP_EFFECT))
        else
            this.isAlive = false
            msg.post(this.view, "hide")

            addEffect("top", "effect_exit", vmath.vector3(this.pos.x, this.pos.y + 40, DEEP_EFFECT))

        end

    end

    function this:setWaitingFood(vX, vY)
        this.action = 2
        this.tickWait = math.random(2,5)

        this.typeFood = gameState.dataMart.typeFoodParrot
        this.needFood = 2
        this.countFood = 0

        msg.post(this.cloudFood, "initCloud", {
            pos = vmath.vector3(vX, vY, 0),
            type = this.typeFood,
            count1 = this.countFood,
            count2 = this.needFood
        })

    end

    function this:collectFood()
        this.countFood = this.countFood + 1

        msg.post(this.cloudFood, "updateCount", {
            count1 = this.countFood,
            count2 = this.needFood
        })

        if (this.countFood >= this.needFood) then
            this.action = 3
            this.tickWait = 3

            this.isFed = true

            msg.post(this.cloudFood, "hide")
            msg.post(this.view, "playAnim", { name = "eat_animal", loop = false} )

            gameState:feedParrot()

        end

    end

    function this:update()
        if (this.action == 2) then              
            this.tickWait = this.tickWait - 1

            if this.tickWait == 0 then
                msg.post(this.view, "playAnim", { name = "ask_to_eat_parrot", loop = false} )
                this.tickWait = math.random(3,10)
            end

        elseif (this.action == 3) then          
            this.tickWait = this.tickWait - 1

            if this.tickWait == 1 then
                gameState:throwDroppedObject(0, this.pos.x, this.pos.y)
                gameState:throwDroppedObject(0, this.pos.x, this.pos.y)
                gameState:throwDroppedObject(0, this.pos.x, this.pos.y)

            elseif this.tickWait == 0 then
                this.action = 0

                local pos = gameState.dataMart.posExit
                this:move(pos)

            end
        end

    end

    
    setmetatable(this,self)
    self.__index = self; return this
end
