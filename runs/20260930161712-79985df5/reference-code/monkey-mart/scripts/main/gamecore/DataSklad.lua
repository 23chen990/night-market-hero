local M = {}



function M.getData(vPos, vTypeFood)
    local w = 20
    local h = 25
    local lvl = 30
    local dx1 = 0
    local dx2 = 12
    local dy1 = 10
    local dy2 = 0
    local isFlip = false

    if (vTypeFood == 4) then
        w = 21
        h = 23
        lvl = 33
        dx1 = 0
        dx2 = 13
        dy1 = 6
        dy2 = 0
    elseif (vTypeFood == 7) then
        w = 17
        h = 26
        lvl = 24
        dx1 = -5
        dx2 = -5+15
        dy1 = -11+7
        dy2 = -11
    elseif (vTypeFood == 8) then
        isFlip = true
        w = 19
        h = 28
        lvl = 22
        dx1 = 0
        dx2 = 12
        dy1 = 5
        dy2 = 0

    elseif (vTypeFood == 9) then
        isFlip = true
        w = 22
        h = 32
        lvl = 24
        dx1 = 0
        dx2 = 12
        dy1 = 5
        dy2 = 0

    elseif (vTypeFood == 10) then
        vPos.z = gameState:getPosZ(vPos.y-10)
        w = 23
        h = 31
        lvl = 15
        dx1 = -5
        dx2 = -5+17
        dy1 = -5+7
        dy2 = -5
    elseif (vTypeFood == 11) then
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 23
        h = 30
        lvl = 30
        dx1 = -8+0
        dx2 = -8+17
        dy1 = -2+6
        dy2 = -2
    elseif (vTypeFood == 12) then
        w = 22
        h = 30
        lvl = 37
        dx1 = 0
        dx2 = 17
        dy1 = 4+6
        dy2 = 4
    elseif (vTypeFood == 13) then
        w = 22
        h = 29
        lvl = 39
        dx1 = -4+0
        dx2 = -4+17
        dy1 = 6+6
        dy2 = 6
    elseif (vTypeFood == 14) then
        w = 25
        h = 30
        lvl = 16
        dx1 = -10+0
        dx2 = -10+19
        dy1 = -19+7
        dy2 = -19
    elseif (vTypeFood == 15) then
        w = 20
        h = 23
        lvl = 16
        dx1 = 0
        dx2 = 14
        dy1 = 6
        dy2 = -1
    elseif (vTypeFood == 16) then
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 21
        h = 27
        lvl = 32
        dx1 = 0
        dx2 = 13
        dy1 = 6
        dy2 = 0
    elseif (vTypeFood == 17) then
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 23
        h = 25
        lvl = 23
        dx1 = -3+0
        dx2 = -3+13
        dy1 = -4+7
        dy2 = -4
    elseif (vTypeFood == 18) then
        w = 23
        h = 30
        lvl = 30
        dx1 = -3+0
        dx2 = -3+17
        dy1 = 6+6
        dy2 = 6
    elseif (vTypeFood == 19) then
        w = 23
        h = 26
        lvl = 35
        dx1 = -3+0
        dx2 = -3+16
        dy1 = 8+6
        dy2 = 8
    elseif (vTypeFood == 20) then
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 21
        h = 27
        lvl = 17
        dx1 = 0
        dx2 = 13
        dy1 = 6
        dy2 = 0
    elseif (vTypeFood == 21) then   
        w = 21
        h = 27
        lvl = 20
        dx1 = -8
        dx2 = -8+12
        dy1 = 6-4
        dy2 = 0-4
    elseif (vTypeFood == 22) then   
        w = 21
        h = 27
        lvl = 15
        dx1 = -7+0
        dx2 = -7+12
        dy1 = 10
        dy2 = 0
    elseif (vTypeFood == 23) then   
        isFlip = true
        w = 20
        h = 27
        lvl = 20
        dx1 = 0
        dx2 = 12
        dy1 = 10
        dy2 = 0
    elseif (vTypeFood == 24) then   
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 22
        h = 28
        lvl = 30
        dx1 = -4
        dx2 = 13
        dy1 = 9
        dy2 = 1
    elseif (vTypeFood == 25) then   
        w = 22
        h = 28
        lvl = 23
        dx1 = 0
        dx2 = 12
        dy1 = 8+7
        dy2 = 8+0
    elseif (vTypeFood == 26) then   
        w = 22
        h = 31
        lvl = 26
        dx1 = -8+0
        dx2 = -8+14
        dy1 = 6+12
        dy2 = 0+12
    elseif (vTypeFood == 27) then   
        isFlip = true
        w = 20
        h = 27
        lvl = 16
        dx1 = -5
        dx2 = 12
        dy1 = 8
        dy2 = 0
    elseif (vTypeFood == 28) then   
        w = 23
        h = 27
        lvl = 35
        dx1 = -5
        dx2 = -5+14
        dy1 = 11+6
        dy2 = 11
    elseif (vTypeFood == 30) then   
        w = 18
        h = 26
        lvl = 35
        dx1 = -1+0
        dx2 = -1+17
        dy1 = 0+6
        dy2 = 0
    elseif (vTypeFood == 31) then   
        w = 20
        h = 27
        lvl = 35
        dx1 = -3
        dx2 = -3+14
        dy1 = 6+6
        dy2 = 6
    elseif (vTypeFood == 32) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 24
        h = 27
        lvl = 14
        dx1 = -8+0
        dx2 = -8+17
        dy1 = -3+6
        dy2 = -3
    elseif (vTypeFood == 33) then   
        w = 23
        h = 27
        lvl = 39
        dx1 = -8+0
        dx2 = -8+17
        dy1 = 15+6
        dy2 = 15
    elseif (vTypeFood == 34) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 23
        h = 28
        lvl = 17
        dx1 = -8+0
        dx2 = -8+17
        dy1 = -2+6
        dy2 = -2
    elseif (vTypeFood == 35) then   
        w = 22
        h = 27
        lvl = 33
        dx1 = -9
        dx2 = -9+12
        dy1 = 4+7
        dy2 = 4+0
    elseif (vTypeFood == 36) then   
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 22
        h = 27
        lvl = 20
        dx1 = -9
        dx2 = -9+12
        dy1 = -2+7
        dy2 = -2+0
    elseif (vTypeFood == 37) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 22
        h = 30
        lvl = 19
        dx1 = -10+0
        dx2 = -10+17
        dy1 = -7+6
        dy2 = -7
    elseif (vTypeFood == 38) then   
        vPos.z = gameState:getPosZ(vPos.y-5)
        w = 22
        h = 32
        lvl = 21
        dx1 = -7
        dx2 = -7+14
        dy1 = 8+7
        dy2 = 8+0
    elseif (vTypeFood == 39) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 22
        h = 31
        lvl = 39
        dx1 = -6
        dx2 = -6+16
        dy1 = 1+7
        dy2 = 1+0
    elseif (vTypeFood == 40) then   
        w = 21
        h = 27
        lvl = 36
        dx1 = -10
        dx2 = -10+14
        dy1 = 13+6
        dy2 = 13
    elseif (vTypeFood == 41) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 22
        h = 28
        lvl = 32
        dx1 = -6
        dx2 = -6+14
        dy1 = 3+7
        dy2 = 3+0
    elseif (vTypeFood == 42) then   
        w = 22
        h = 27
        lvl = 23
        dx1 = -6+0
        dx2 = -6+12
        dy1 = 6+6
        dy2 = 6+0
    elseif (vTypeFood == 43) then   
        w = 21
        h = 28
        lvl = 27
        dx1 = -11+0
        dx2 = -11+12
        dy1 = 3+7
        dy2 = 3+0
    elseif (vTypeFood == 44) then   
        w = 21
        h = 28
        lvl = 29
        dx1 = -8+0
        dx2 = -8+14
        dy1 = 1+10
        dy2 = 1+2
    elseif (vTypeFood == 45) then   
        w = 22
        h = 30
        lvl = 27
        dx1 = -3+0
        dx2 = -3+14
        dy1 = 6+8
        dy2 = 0+8
    elseif (vTypeFood == 46) then   
        vPos.z = gameState:getPosZ(vPos.y-40)
        w = 21
        h = 28
        lvl = 24
        dx1 = -8+0
        dx2 = -8+12
        dy1 = 1+10
        dy2 = 1+2
    elseif (vTypeFood == 47) then   
        w = 21
        h = 28
        lvl = 35
        dx1 = -1+0
        dx2 = -1+12
        dy1 = 1+7
        dy2 = 1+0
    end

    local arPos = {
        {x = vPos.x-w+dx1,	y = vPos.y+dy1,			z = vPos.z + 0.00023},
        {x = vPos.x+w+dx1,	y = vPos.y+dy2,			z = vPos.z + 0.00024},
        {x = vPos.x-w+dx2,	y = vPos.y+dy1+h,		z = vPos.z + 0.00021},
        {x = vPos.x+w+dx2,	y = vPos.y+dy2+h,		z = vPos.z + 0.00022},
        {x = vPos.x-w+dx1,	y = vPos.y+dy1+lvl,		z = vPos.z + 0.00027},
        {x = vPos.x+w+dx1,	y = vPos.y+dy2+lvl,		z = vPos.z + 0.00028},
        {x = vPos.x-w+dx2,	y = vPos.y+dy1+h+lvl,	z = vPos.z + 0.00025},
        {x = vPos.x+w+dx2,	y = vPos.y+dy2+h+lvl,	z = vPos.z + 0.00026}
    }

    return arPos, isFlip

end



function M.getSklad_info1_15(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-90,-50,0)
    local w = 40
    local h = 40
    local a = 6
    local z1 = 0.0023
    local z2 = 0.0022
    local z3 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 1) then                
        
        
        
        
        
        
        
        
    elseif (vTypeFood == 7) then                
        
        
        
        
        
        
        
        
    elseif (vTypeFood == 15) then
        w = 39
        h = 40
        a = 6
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -91
        posOffset.y = -50
    elseif (vTypeFood == 27) then           
        
        
        
        
        
        
        
        
        
    elseif (vTypeFood == 30) then       
        w = 40
        h = 39
        a = 6
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -95
        posOffset.y = -43
    elseif (vTypeFood == 35) then       
        w = 40
        h = 40
        a = 6
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -100
        posOffset.y = -39
    elseif (vTypeFood == 40) then       
        w = 38
        h = 38
        a = 6
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -94
        posOffset.y = -36
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},
        {x = 3*w,	y = 0*h-a*3,	z = z1},
        {x = 4*w,	y = 0*h-a*4,	z = z1},

        {x = 0*w+11,	y = 1*h-a*0,	z = z2},
        {x = 1*w+11,	y = 1*h-a*1,	z = z2},
        {x = 2*w+11,	y = 1*h-a*2,	z = z2},
        {x = 3*w+11,	y = 1*h-a*3,	z = z2},
        {x = 4*w+11,	y = 1*h-a*4,	z = z2},

        {x = 0*w+22,	y = 2*h-a*0,	z = z3},
        {x = 1*w+22,	y = 2*h-a*1,	z = z3},
        {x = 2*w+22,	y = 2*h-a*2,	z = z3},
        {x = 3*w+22,	y = 2*h-a*3,	z = z3},
        {x = 4*w+22,	y = 2*h-a*4,	z = z3}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -95-a*0},
        {x = -140+w*1,	y = -95-a*1},
        {x = -140+w*2,	y = -95-a*3},
        {x = -140+w*3,	y = -95-a*4},
        {x = -140+w*4,	y = -95-a*4},
        {x = -140+w*5,	y = -95-a*4}
    }

    local offsetBuy = vmath.vector3(-40,-160,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info1_12(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-90,-50,0)
    local w = 40
    local h = 40
    local a = 6
    local z1 = 0.0023
    local z2 = 0.0022
    local z3 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 33) then
        w = 52
        h = 42
        a = 8
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -95
        posOffset.y = -31
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},
        {x = 3*w,	y = 0*h-a*3,	z = z1},

        {x = 0*w+11,	y = 1*h-a*0,	z = z2},
        {x = 1*w+11,	y = 1*h-a*1,	z = z2},
        {x = 2*w+11,	y = 1*h-a*2,	z = z2},
        {x = 3*w+11,	y = 1*h-a*3,	z = z2},

        {x = 0*w+22,	y = 2*h-a*0,	z = z3},
        {x = 1*w+22,	y = 2*h-a*1,	z = z3},
        {x = 2*w+22,	y = 2*h-a*2,	z = z3},
        {x = 3*w+22,	y = 2*h-a*3,	z = z3}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -95-a*0},
        {x = -140+w*1,	y = -95-a*1},
        {x = -140+w*2,	y = -95-a*3},
        {x = -140+w*3,	y = -95-a*4},
        {x = -140+w*4,	y = -95-a*4},
        {x = -140+w*5,	y = -95-a*4}
    }

    local offsetBuy = vmath.vector3(-40,-160,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info2(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-60,-80,0)
    local w = 45
    local h = 40
    local a = 7
    local z1 = 0.000022
    local z2 = 0.000021
    local koefZ = 0

    
    

    if (vTypeFood == 5) then
        w = 45
        h = 40
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        posOffset.x = -60
        posOffset.y = -82
        posOffset.z = -70+1
    end

    local dopZ = 0.01
    

    local arPos = {
        {x = 0*w,		y = 12-a*0, z = z1},
    	{x = 1*w,		y = 12-a*1, z = z1},
    	{x = 2*w,		y = 12-a*2, z = z1},
    	{x = 0*w+14,	y = 43-a*0,	z = z2},
    	{x = 1*w+14,	y = 43-a*1,	z = z2},
    	{x = 2*w+14,	y = 43-a*2,	z = z2},

    	{x = 0*w,		y = 12-a*0+85,	z = z1 + dopZ},
    	{x = 1*w,		y = 12-a*1+85,	z = z1 + dopZ},
    	{x = 2*w,		y = 12-a*2+85,	z = z1 + dopZ},
    	{x = 0*w+14,	y = 43-a*0+85,	z = z2 + dopZ},
    	{x = 1*w+14,	y = 43-a*1+85,	z = z2 + dopZ},
    	{x = 2*w+14,	y = 43-a*2+85,	z = z2 + dopZ}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -105-a*0},
        {x = -140+w*1,	y = -105-a*1},
        {x = -140+w*2,	y = -105-a*3},
        {x = -140+w*3,	y = -105-a*4},
        {x = -140+w*4,	y = -105-a*4},
        {x = -140+w*5,	y = -105-a*4}
    }

    local offsetBuy = vmath.vector3(-30,-170,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info3(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-80,-50,-35)
    local w = 40
    local h = 60
    local a = 7
    local z1 = 0.0023
    local z2 = 0.0022
    local z3 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 18) then
        w = 43
        h = 60
        a = 7
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -82
        posOffset.y = -51
        koefZ = 0.0001
    elseif (vTypeFood == 47) then
        w = 43
        h = 60
        a = 7
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -82
        posOffset.y = -42
        koefZ = 0.00001
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},
        {x = 3*w,	y = 0*h-a*3,	z = z1},

        {x = 0*w+11,	y = 1*h-a*0,	z = z2},
        {x = 1*w+11,	y = 1*h-a*1,	z = z2},
        {x = 2*w+11,	y = 1*h-a*2,	z = z2},
        {x = 3*w+11,	y = 1*h-a*3,	z = z2},

        {x = 0*w+22,	y = 2*h-a*0,	z = z3},
        {x = 1*w+22,	y = 2*h-a*1,	z = z3},
        {x = 2*w+22,	y = 2*h-a*2,	z = z3},
        {x = 3*w+22,	y = 2*h-a*3,	z = z3}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -105-a*0},
        {x = -140+w*1,	y = -105-a*1},
        {x = -140+w*2,	y = -105-a*3},
        {x = -140+w*3,	y = -105-a*4},
        {x = -140+w*4,	y = -105-a*4},
        {x = -140+w*5,	y = -105-a*4}
    }

    local offsetBuy = vmath.vector3(-40,-160,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }
end

function M.getSklad_info4(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-75,-50,0)
    local w = 42
    local h = 46
    local a = 7
    local z1 = 0.0023
    local z2 = 0.0022
    local z3 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 23) then
        isFlip = true
        w = 42
        h = 46
        a = 7
        posOffset.x = -75
        posOffset.y = -50
        koefZ = -0.00001
    elseif (vTypeFood == 31) then
        w = 42
        h = 47
        a = 7
        posOffset.x = -80
        posOffset.y = -47
    elseif (vTypeFood == 34) then
        w = 42
        h = 49
        a = 7
        posOffset.x = -80
        posOffset.y = -50
    elseif (vTypeFood == 39) then
        w = 42
        h = 46
        a = 6
        posOffset.x = -82
        posOffset.y = -45
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},
        {x = 3*w,	y = 0*h-a*3,	z = z1},

        {x = 0*w+11,	y = 1*h-a*0,	z = z2},
        {x = 1*w+11,	y = 1*h-a*1,	z = z2},
        {x = 2*w+11,	y = 1*h-a*2,	z = z2},
        {x = 3*w+11,	y = 1*h-a*3,	z = z2},

        {x = 0*w+22,	y = 2*h-a*0,	z = z3},
        {x = 1*w+22,	y = 2*h-a*1,	z = z3},
        {x = 2*w+22,	y = 2*h-a*2,	z = z3},
        {x = 3*w+22,	y = 2*h-a*3,	z = z3}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -135+w*0,	y = -105-a*0},
        {x = -135+w*1,	y = -105-a*1},
        {x = -135+w*2,	y = -105-a*3},
        {x = -135+w*3,	y = -105-a*4},
        {x = -135+w*4,	y = -105-a*4},
        {x = -135+w*5,	y = -105-a*4}
    }

    local offsetBuy = vmath.vector3(-40,-165,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info5(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-75,-30,-36)
    local w = 15
    local h = 40
    local a = 6
    local z1 = 0.0024
    local z2 = 0.0023
    local z3 = 0.0022
    local z4 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 14) then
        
        
        
        
        
    elseif (vTypeFood == 24) then
        
        
        
        
        
    elseif (vTypeFood == 29) then   
        w = 14
        h = 40
        a = 9
        posOffset.x = -74
        posOffset.y = -22
    elseif (vTypeFood == 32) then   
        w = 14
        h = 42
        a = 12
        posOffset.x = -78
        posOffset.y = -35
    elseif (vTypeFood == 37) then   
        w = 13
        h = 30
        a = 1
        posOffset.x = -78
        posOffset.y = -29
    elseif (vTypeFood == 45) then   
        w = 14
        h = 37
        a = 6
        posOffset.x = -77
        posOffset.y = -21
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 1*h-a*1,	z = z2},
        {x = 2*w,	y = 2*h-a*2,	z = z3},
        {x = 3*w,	y = 3*h-a*3,	z = z4},

        {x = 0*w+55,	y = 0*h-a*0-37,	z = z1},
        {x = 1*w+55,	y = 1*h-a*1-37,	z = z2},
        {x = 2*w+55,	y = 2*h-a*2-37,	z = z3},
        {x = 3*w+55,	y = 3*h-a*3-37,	z = z4},

        {x = 0*w+110,	y = 0*h-a*0-74,	z = z1},
        {x = 1*w+110,	y = 1*h-a*1-74,	z = z2},
        {x = 2*w+110,	y = 2*h-a*2-74,	z = z3},
        {x = 3*w+110,	y = 3*h-a*3-74,	z = z4},
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -100+w*0,	y = -140-a*0},
        {x = -100+w*1,	y = -140-a*1},
        {x = -100+w*2,	y = -140-a*2},
        {x = -100+w*3,	y = -140-a*3},
        {x = -100+w*4,	y = -140-a*2},
        {x = -100+w*5,	y = -140-a*1}
    }

    local offsetBuy = vmath.vector3(-40,-185,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info6(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-50,-80,-70+1)
    local w = 43
    local h = 55
    local a = 6
    local z1 = 0.000023
    local z2 = 0.000022
    local z3 = 0.000021
    local koefZ = 0.000001

    if (vTypeFood == 4) then    
        w = 43
        h = 55
        a = 6
        z1 = 0.000023
        z2 = 0.000022
        z3 = 0.000021
        posOffset.x = -51
        posOffset.y = -83
        posOffset.z = -70+1
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},

        {x = 0*w,	y = 1*h-a*0,	z = z2},
        {x = 1*w,	y = 1*h-a*1,	z = z2},
        {x = 2*w,	y = 1*h-a*2,	z = z2},

        {x = 0*w,	y = 2*h-a*0,	z = z1},
        {x = 1*w,	y = 2*h-a*1,	z = z1},
        {x = 2*w,	y = 2*h-a*2,	z = z1}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -115-a*0},
        {x = -140+w*1,	y = -115-a*1},
        {x = -140+w*2,	y = -115-a*3},
        {x = -140+w*3,	y = -115-a*4},
        {x = -140+w*4,	y = -115-a*4},
        {x = -140+w*5,	y = -115-a*4}
    }

    local offsetBuy = vmath.vector3(-30,-160,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info7(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-80,-20,-5+1)
    local w = 46
    local h = 30
    local a = 6
    local z1 = 0.00003
    local z2 = 0.00002
    local z3 = 0.00001
    local koefZ = 0.000001

    if (vTypeFood == 19) then    
        w = 46
        h = 30
        a = 6
        z1 = 0.00003
        z2 = 0.00002
        z3 = 0.00001
        posOffset.x = -80
        posOffset.y = -20
        posOffset.z = -5+1
    elseif (vTypeFood == 41) then    
        w = 45
        h = 32
        a = 6
        z1 = 0.00003
        z2 = 0.00002
        z3 = 0.00001
        posOffset.x = -82
        posOffset.y = -8
        posOffset.z = -5+1
    elseif (vTypeFood == 46) then    
        w = 45
        h = 33
        a = 6
        z1 = 0.00003
        z2 = 0.00002
        z3 = 0.00001
        posOffset.x = -81
        posOffset.y = -12
        posOffset.z = -5+1
    end

    local arPos = {
        {x = 0*w,	y = 0*h-a*0,	z = z1},
        {x = 1*w,	y = 0*h-a*1,	z = z1},
        {x = 2*w,	y = 0*h-a*2,	z = z1},
        {x = 3*w,	y = 0*h-a*3,	z = z1},

        {x = 0*w+13,	y = 1*h-a*0,	z = z2},
        {x = 1*w+13,	y = 1*h-a*1,	z = z2},
        {x = 2*w+13,	y = 1*h-a*2,	z = z2},
        {x = 3*w+13,	y = 1*h-a*3,	z = z2},

        {x = 0*w+26,	y = 2*h-a*0,	z = z3},
        {x = 1*w+26,	y = 2*h-a*1,	z = z3},
        {x = 2*w+26,	y = 2*h-a*2,	z = z3},
        {x = 3*w+26,	y = 2*h-a*3,	z = z3}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -140+w*0,	y = -90-a*0},
        {x = -140+w*1,	y = -90-a*1},
        {x = -140+w*2,	y = -90-a*3},
        {x = -140+w*3,	y = -90-a*4},
        {x = -140+w*4,	y = -90-a*4},
        {x = -140+w*5,	y = -90-a*4}
    }

    local offsetBuy = vmath.vector3(-30,-160,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info8(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-50,-50,0)
    local w = 45
    local h = 0
    local a = 7
    local z1 = 0.000022
    local z2 = 0.000021
    local koefZ = 0
    local y1 = 12
    local y2 = 46

    if (vTypeFood == 10) then    
        w = 45
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 46
        posOffset.x = -48
        posOffset.y = -50
    elseif (vTypeFood == 26) then   
        w = 47
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 46 + 5
        posOffset.x = -52
        posOffset.y = -46
    elseif (vTypeFood == 36) then   
        w = 49
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 46 + 4
        posOffset.x = -54
        posOffset.y = -43
    elseif (vTypeFood == 38) then   
        isFlip = true
        w = 47
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 46 + 4
        posOffset.x = -55
        posOffset.y = -43 - 3
    elseif (vTypeFood == 42) then   
        w = 47
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 50
        posOffset.x = -52
        posOffset.y = -42
    elseif (vTypeFood == 43) then   
        isFlip = true
        w = 47
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 51
        posOffset.x = -52
        posOffset.y = -48
    elseif (vTypeFood == 44) then   
        w = 47
        h = 0
        a = 7
        z1 = 0.000022
        z2 = 0.000021
        y1 = 12
        y2 = 52
        posOffset.x = -50
        posOffset.y = -46
    end

    local arPos = {
        {x = -85+0*w,		y = y1-a*0+26,	z = z1},
        {x = -85+1*w,		y = y1-a*1+26,	z = z1},
        {x = -85+2*w,		y = y1-a*2+26,	z = z1},
        {x = -85+0*w+16,	y = y2-a*0+26,	z = z2},
        {x = -85+1*w+16,	y = y2-a*1+26,	z = z2},
        {x = -85+2*w+16,	y = y2-a*2+26,	z = z2},

        {x = 71+0*w,		y = y1-a*0+3,	z = z1},
        {x = 71+1*w,		y = y1-a*1+3,	z = z1},
        {x = 71+2*w,		y = y1-a*2+3,	z = z1},
        {x = 71+0*w+16,	    y = y2-a*0+3,	z = z2},
        {x = 71+1*w+16,	    y = y2-a*1+3,	z = z2},
        {x = 71+2*w+16,	    y = y2-a*2+3,	z = z2}
    }

    w = 43
    a = 8

    local arPlaces = {
        {x = -130+w*0,	y = -80-a*0},
        {x = -130+w*1,	y = -80-a*1},
        {x = -130+w*2,	y = -80-a*3},
        {x = -130+w*3,	y = -80-a*4},
        {x = -130+w*4,	y = -80-a*4},
        {x = -130+w*5,	y = -80-a*4}
    }

    local offsetBuy = vmath.vector3(-30,-140,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSklad_info9(vTypeFood)  
    local isFlip = false
    local posOffset = vmath.vector3(-51,-19,0)
    local w = 40
    local h = 20
    local a = 5
    local z1 = 0.0023
    local z2 = 0.0022
    local z3 = 0.0021
    local koefZ = 0.00001

    if (vTypeFood == 3) then    
        w = 40
        h = 20
        a = 5
        z1 = 0.0023
        z2 = 0.0022
        z3 = 0.0021
        posOffset.x = -51
        posOffset.y = -19
    end

    local arPos = {
        {x = 0*w+8*0,	y = 0*h-a*0,	z = z1},
        {x = 1*w+8*0,	y = 0*h-a*1,	z = z1},
        {x = 2*w+8*0,	y = 0*h-a*2,	z = z1},

        {x = 0*w+8*1,	y = 1*h-a*0,	z = z2},
        {x = 1*w+8*1,	y = 1*h-a*1,	z = z2},
        {x = 2*w+8*1,	y = 1*h-a*2,	z = z2},

        {x = 0*w+8*2,	y = 2*h-a*0,	z = z3},
        {x = 1*w+8*2,	y = 2*h-a*1,	z = z3},
        {x = 2*w+8*2,	y = 2*h-a*2,	z = z3}
    }

    w = 34
    a = 8

    local arPlaces = {
        {x = -100+w*0,	y = -100-a*0},
        {x = -100+w*1,	y = -100-a*1},
        {x = -100+w*2,	y = -100-a*3},
        {x = -100+w*3,	y = -100-a*4},
        {x = -100+w*4,	y = -100-a*4},
        {x = -100+w*5,	y = -100-a*4}
    }

    local offsetBuy = vmath.vector3(-30,-140,0)

    return {
        offsetBuy = offsetBuy,
        posOffset = posOffset,
        isFlip = isFlip,
        arPos = arPos,
        arPlaces = arPlaces,
        koefZ = koefZ
    }

end

function M.getSkladMaxCountFood(vTypeSklad)
    if (vTypeSklad == "sklad_palet_15") then
        return 15
    elseif (vTypeSklad == "sklad_palet_12") then
        return 12
    elseif (vTypeSklad == "sklad_2_polki") then
        return 12
    elseif (vTypeSklad == "sklad_3_polki") then
        return 12
    elseif (vTypeSklad == "sklad_brevna") then
        return 12
    elseif (vTypeSklad == "sklad_3_stupeni") then
        return 12
    elseif (vTypeSklad == "sklad_holodos") then
        return 9
    elseif (vTypeSklad == "sklad_morozilka") then
        return 12
    elseif (vTypeSklad == "sklad_2_paleta") then
        return 12
    elseif (vTypeSklad == "sklad_eggs") then
        return 9
    end
end

function M.getSkladPositionsFood(vTypeSklad, vTypeFood)
    

    if (vTypeSklad == "sklad_palet_15") then        
        return M.getSklad_info1_15(vTypeFood)
    elseif (vTypeSklad == "sklad_palet_12") then    
        return M.getSklad_info1_12(vTypeFood)
    elseif (vTypeSklad == "sklad_2_polki") then     
        return M.getSklad_info2(vTypeFood)
    elseif (vTypeSklad == "sklad_3_polki") then     
        return M.getSklad_info3(vTypeFood)
    elseif (vTypeSklad == "sklad_brevna") then      
        return M.getSklad_info4(vTypeFood)
    elseif (vTypeSklad == "sklad_3_stupeni") then   
        return M.getSklad_info5(vTypeFood)
    elseif (vTypeSklad == "sklad_holodos") then     
        return M.getSklad_info6(vTypeFood)
    elseif (vTypeSklad == "sklad_morozilka") then   
        return M.getSklad_info7(vTypeFood)
    elseif (vTypeSklad == "sklad_2_paleta") then    
        return M.getSklad_info8(vTypeFood)
    elseif (vTypeSklad == "sklad_eggs") then        
        return M.getSklad_info9(vTypeFood)
    end

end

function M.getSkladDecor(vTypeSklad)
    local offsetIcon = 0
    local posIcon = vmath.vector3(0,0,0)
    local posCarpet = vmath.vector3(0,0,0)
    local posCarpet2 = nil
    local carpetSprite = "carpet1"
    local scaleCarpet = 1

    if (vTypeSklad == "sklad_palet") or (vTypeSklad == "sklad_palet_12") or (vTypeSklad == "sklad_palet_15") then           
        posIcon.x = 15
        posIcon.y = -20
        posCarpet.x = -10
        posCarpet.y = -73
        offsetIcon = 98
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_2_polki") then     
        posIcon.x = 0
        posIcon.y = -70
        posCarpet.x = -10
        posCarpet.y = -115
        offsetIcon = 168
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_3_polki") then     
        posIcon.x = 6
        posIcon.y = -46
        posCarpet.x = -7
        posCarpet.y = -100
        offsetIcon = 131
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_brevna") then      
        posIcon.x = 15
        posIcon.y = -15
        posCarpet.x = -5
        posCarpet.y = -73
        offsetIcon = 98
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_3_stupeni") then   
        posIcon.x = 25
        posIcon.y = -35 - 3
        posCarpet.x = 25
        posCarpet.y = -80
        offsetIcon = 144 + 3
        carpetSprite = "carpet1"
        scaleCarpet = 1.15
    elseif (vTypeSklad == "sklad_holodos") then     
        posIcon.x = -5
        posIcon.y = -70
        posCarpet.x = -7
        posCarpet.y = -100
        offsetIcon = 166
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_morozilka") then     
        posIcon.x = 10
        posIcon.y = -15
        posCarpet.x = -1
        posCarpet.y = -55
        offsetIcon = 129
        carpetSprite = "carpet1"
    elseif (vTypeSklad == "sklad_2_paleta") then    
        posCarpet2 = vmath.vector3(0,0,0)
        posIcon.x = 10
        posIcon.y = -30
        posCarpet.x = -86
        posCarpet.y = -45
        posCarpet2.x = 83
        posCarpet2.y = -70
        offsetIcon = 98
        carpetSprite = "carpet2"

    elseif (vTypeSklad == "sklad_akvarium") then    
        posIcon.x = 15
        posIcon.y = -70
        posCarpet.x = -10
        posCarpet.y = -80
        offsetIcon = 202
        carpetSprite = "carpet1"

    elseif (vTypeSklad == "sklad_eggs") then    
        posCarpet.x = -6
        posCarpet.y = -85
        carpetSprite = "carpet2"

    end

    return {
        offsetIcon = offsetIcon,
        posIcon = posIcon,
        posCarpet = posCarpet,
        posCarpet2 = posCarpet2,
        carpetSprite = carpetSprite,
        scaleCarpet = scaleCarpet
    }

end

function M.getZavodDecor(vTypeZavod)
    local offsetIcon = 0
    local posIcon = vmath.vector3(0,0,0)
    local posCarpet = vmath.vector3(0,0,0)
    local carpetSprite = "carpet1"
    local scaleCarpet = 1

    if (vTypeZavod == "zavod_simple") then
        posCarpet.x = -9
        posCarpet.y = -45
        offsetIcon = 55
    elseif (vTypeZavod == "zavod_simple_v") then
        carpetSprite = "carpet2"
        posCarpet.x = 45
        posCarpet.y = -30
        offsetIcon = 0
    elseif (vTypeZavod == "zavod_big2") then
        posCarpet.x = -9
        posCarpet.y = -45
        offsetIcon = 55
    end

    return {
        offsetIcon = offsetIcon,
        posIcon = posIcon,
        posCarpet = posCarpet,
        carpetSprite = carpetSprite,
        scaleCarpet = scaleCarpet
    }
end

function M.getZavodOffsetArrow(vTypeZavod, vLinkName)
    local pos = vmath.vector3(-32,-100,0)
    
    

    local positions_monkey = {
        right = { x = 95, y = -20 },
        left  = { x = -90, y = 20 },
        up    = { x = 30, y = 90 },
        down  = { x = -25, y = -60 }
    }

    if (vTypeZavod == "monkey") then
        pos = positions_monkey["right"]
    end

    if (global.numMarket == 1) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim3') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim4') then 
                pos = positions_monkey["left"]
            end
        elseif (vTypeZavod == "chicken") then
            pos.x = -60
            pos.y = 110
        elseif (vTypeZavod == "cow") then
            pos.x = 370
            pos.y = -40
        end

    elseif (global.numMarket == 2) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim4') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim5') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim6') then 
                pos = positions_monkey["left"]
            end

        elseif (vTypeZavod == "coffeeground") then
            pos.x = 130
            pos.y = -10
        end

    elseif (global.numMarket == 3) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim3') then 
                pos = positions_monkey["right"]
                pos.x = pos.x - 20
            elseif (vLinkName == 'placebox_aim4') then 
                pos = positions_monkey["right"]
            elseif (vLinkName == 'placebox_aim7') then 
                pos.x = pos.x - 10
            elseif (vLinkName == 'placebox_caravan') then 
                pos.x = -180
                pos.y = -175
            end
        elseif (vTypeZavod == "cow") then
            pos.x = -150
            pos.y = -50
        elseif (vTypeZavod == "cow2") then
            pos.x = -150
            pos.y = -50
        end

    elseif (global.numMarket == 4) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim3') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim4') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim5') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim6') then 
                pos = positions_monkey["left"]
            end
        end

    elseif (global.numMarket == 5) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim3') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim4') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim5') then 
                pos = positions_monkey["left"]
            elseif (vLinkName == 'placebox_aim7') then 
                pos = positions_monkey["left"]
            end
        elseif (vTypeZavod == "bread") then
            pos.x = 130
            pos.y = -10
        elseif (vTypeZavod == "chicken") then
            pos.x = -120
            pos.y = 15
        elseif (vTypeZavod == "pig") then
            pos.x = -120
            pos.y = 15
        end

    elseif (global.numMarket == 6) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["down"]
            elseif (vLinkName == 'placebox_aim5') then 
                pos = positions_monkey["right"]
            end
        end

    elseif (global.numMarket == 101) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_aim2') then 
                pos = positions_monkey["right"]
                pos.y = pos.y + 65
            end
        end

    elseif (global.numMarket == 102) then
        if (vTypeZavod == "monkey") then
            if (vLinkName == 'placebox_caravan') then 
                pos.x = 60
                pos.y = -165
            end
        elseif (vTypeZavod == "wreath") then
            pos.x = 130
            pos.y = -10
        elseif (vTypeZavod == "cookie") then
            pos.x = 130
            pos.y = -10            
        end
    end

    return pos
end

return setmetatable(M, {
	__call = function(self, key, ...)
		return M.translate(key, ...)
	end
})
