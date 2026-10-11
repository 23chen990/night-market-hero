/* Reference-aligned large silhouettes; no reference pixels are used in these paintings. */
function createSceneSurfaces(){
  let seed=28973;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function roof(){
    const c=canvas(1280,570),g=c.getContext('2d');g.scale(2,2);
    g.beginPath();g.moveTo(-35,-50);g.lineTo(68,-43);g.bezierCurveTo(180,4,280,24,363,67);g.bezierCurveTo(430,102,510,121,580,121);g.quadraticCurveTo(605,116,615,91);g.quadraticCurveTo(625,79,628,95);g.quadraticCurveTo(625,147,597,173);g.bezierCurveTo(551,205,443,223,317,213);g.bezierCurveTo(200,205,73,190,-34,165);g.closePath();
    const base=g.createLinearGradient(0,0,220,220);base.addColorStop(0,'#04111b');base.addColorStop(.50,'#091b27');base.addColorStop(1,'#081722');g.fillStyle=base;g.fill();g.save();g.clip();
    for(let row=-4;row<13;row++){
      const tw=19+row*.55;
      for(let x=-50+(row%2)*tw*.5;x<660;x+=tw){
        const y=row*17.3+x*.109-Math.sin(x/500)*8;
        const v=r();g.fillStyle=v<.35?'#081b29':v<.7?'#0b2030':'#0d2230';
        g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+tw*.38,y-6,x+tw*.72,y-3,x+tw,y+5);g.lineTo(x+tw-3,y+14);g.bezierCurveTo(x+tw*.59,y+22,x+tw*.12,y+13,x,y);g.fill();
        g.strokeStyle='rgba(1,9,17,.7)';g.lineWidth=2.1;g.stroke();
        g.strokeStyle='rgba(41,63,77,.25)';g.lineWidth=.8;g.beginPath();g.moveTo(x+3,y+1);g.quadraticCurveTo(x+tw*.5,y-2,x+tw-2,y+6);g.stroke();
        if(r()>.55){g.fillStyle='rgba(43,51,57,.10)';g.fillRect(x+5,y+4,6+r()*8,2);}
      }
    }
    // Irregular age and shade across whole roof planes, restrained near-black palette.
    for(let i=0;i<3300;i++){g.fillStyle=r()>.4?'rgba(1,8,14,.10)':'rgba(38,56,66,.055)';g.fillRect(r()*650,r()*255,1+r()*6,.5+r()*3);}
    const shade=g.createLinearGradient(0,0,0,250);shade.addColorStop(0,'rgba(0,4,10,.35)');shade.addColorStop(.75,'rgba(0,4,10,.08)');shade.addColorStop(1,'rgba(0,4,10,.5)');g.fillStyle=shade;g.fillRect(0,0,650,270);g.restore();
    g.fillStyle='#04121d';g.beginPath();g.moveTo(-15,174);g.bezierCurveTo(173,208,361,221,519,205);g.lineTo(510,229);g.bezierCurveTo(339,241,157,223,-15,196);g.closePath();g.fill();
    g.strokeStyle='#172733';g.lineWidth=2;g.beginPath();g.moveTo(-10,190);g.bezierCurveTo(150,217,330,228,510,217);g.stroke();
    for(let x=10;x<481;x+=56){const y=204+Math.sin(x/400)*17;g.fillStyle='#06141e';g.fillRect(x,y,13,24);g.fillStyle='#10212d';g.fillRect(x+2,y+4,4,17);g.fillStyle='#030e18';g.fillRect(x-3,y+22,20,6);}
    return c;
  }
  function cloth(kind){
    const c=canvas(1200,500),g=c.getContext('2d');g.scale(2,2);
    g.beginPath();
    if(kind==='center'){g.moveTo(5,73);g.bezierCurveTo(189,113,411,72,584,8);g.bezierCurveTo(571,47,569,113,556,148);g.bezierCurveTo(348,200,142,175,22,120);g.closePath();}
    else if(kind==='left'){g.moveTo(-10,2);g.bezierCurveTo(124,63,337,94,586,95);g.bezierCurveTo(544,155,372,194,165,164);g.bezierCurveTo(91,153,28,139,-10,118);g.closePath();}
    else {g.moveTo(75,2);g.bezierCurveTo(143,66,341,97,608,160);g.bezierCurveTo(542,198,302,215,12,160);g.bezierCurveTo(59,94,65,43,75,2);g.closePath();}
    const fill=g.createLinearGradient(0,0,280,220);fill.addColorStop(0,'#071a25');fill.addColorStop(.36,'#081923');fill.addColorStop(.68,'#05121c');fill.addColorStop(1,'#041019');g.fillStyle=fill;g.fill();g.save();g.clip();
    const folds=kind==='center'?[[8,72,180,151],[584,6,378,166],[583,8,127,151]]:kind==='left'?[[0,0,365,138],[600,91,204,143]]:[[75,0,458,176],[72,0,169,164],[605,155,223,183]];
    for(const [x,y,xx,yy] of folds){
      for(let i=0;i<8;i++){g.strokeStyle=i<3?'rgba(36,49,59,.16)':'rgba(0,5,11,.2)';g.lineWidth=1.5+i;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo((x+xx)/2,(y+yy)/2+20+i,xx,yy+i);g.stroke();}
    }
    for(let i=0;i<9500;i++){g.fillStyle=r()<.5?'rgba(96,99,91,.018)':'rgba(0,3,8,.09)';g.fillRect(r()*602,r()*220,.3+r()*2,1+r()*5);}
    g.restore();g.strokeStyle='rgba(37,50,58,.35)';g.lineWidth=1.3;g.stroke();
    return c;
  }
  return {roofCode:roof(),clothCenter:cloth('center'),clothLeft:cloth('left'),clothRight:cloth('right')};
}
