/* Code-native facade trial. Detailed geometry is judged visually before adoption. */
function createFacadeArt(){
  let seed=6159;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function polygon(g,p,color){g.fillStyle=color;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  function stroke(g,x,y,xx,yy,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();}
  function timber(g,x,y,w,h,color='#0b1c25',edge='#1e3038'){
    polygon(g,[[x+1,y+2],[x+w-3,y],[x+w,y+h-2],[x+2,y+h]],color);
    stroke(g,x+3,y+4,x+3,y+h-3,edge,2);stroke(g,x+4,y+h-3,x+w-3,y+h-3,'#030d14',4);
    const vertical=h>w;
    for(let i=0;i<Math.max(w,h)*.43;i++){
      const u=random(),v=random(),a=.05+random()*.14;
      if(vertical){const xx=x+u*w;stroke(g,xx,y+v*h,xx+random()*2-1,Math.min(y+h,y+v*h+8+random()*34),`rgba(107,107,90,${a})`,.6);}
      else{const yy=y+v*h;stroke(g,x+u*w,yy,Math.min(x+w,x+u*w+8+random()*43),yy+random()*2-1,`rgba(89,100,100,${a})`,.65);}
    }
    for(let i=0;i<5;i++){const xx=x+random()*w,yy=y+random()*h;g.fillStyle='rgba(0,5,10,.17)';g.fillRect(xx,yy,vertical?2+random()*3:12+random()*19,vertical?13+random()*36:2+random()*2);}
  }
  function paperWindow(g,x,y,w,h,lit=false){
    const bg=g.createLinearGradient(x,y,x+w,y+h);
    bg.addColorStop(0,lit?'#a37540':'#132731');bg.addColorStop(.55,lit?'#795736':'#10212c');bg.addColorStop(1,lit?'#584333':'#091b27');
    g.fillStyle=bg;g.fillRect(x,y,w,h);
    for(let i=0;i<130;i++){g.fillStyle=lit?'rgba(235,189,100,.035)':'rgba(65,79,77,.08)';g.fillRect(x+random()*w,y+random()*h,1+random()*5,3+random()*25);}
    timber(g,x-10,y-12,w+20,16,'#071722');timber(g,x-9,y-5,12,h+17,'#05131d');timber(g,x+w-5,y-4,12,h+17,'#071823');
    timber(g,x-11,y+h-4,w+22,18,'#06131d');
    const count=Math.max(3,Math.floor(w/23));
    for(let i=1;i<count;i++){const xx=x+i*w/count;timber(g,xx,y+2,4.6,h-5,'#071823','#21323a');}
    // Deliberate unequal fields, unlike a repeated whole-building grid.
    for(const offset of [h*.16,h*.44,h*.72])timber(g,x+1,y+offset,w-2,7,'#071720','#20333e');
    const yy=y+h*.72;
    for(let i=0;i<count;i++){const xx=x+i*w/count+4;stroke(g,xx,yy+5,xx+10,yy+20,'#06151f',3);stroke(g,xx+10,yy+20,xx,yy+34,'#06151f',3);}
  }
  function texture(c,strength=.10){
    const g=c.getContext('2d'),grain=surface(c.width,c.height),gg=grain.getContext('2d'),d=gg.createImageData(c.width,c.height);
    for(let i=0;i<d.data.length;i+=4){const a=random();d.data[i]=d.data[i+1]=d.data[i+2]=a<.45?10:78;d.data[i+3]=Math.floor(random()*255*strength);}
    gg.putImageData(d,0,0);g.save();g.globalCompositeOperation='source-atop';g.drawImage(grain,0,0);g.restore();
  }
  function near(){
    const c=surface(768,1056),g=c.getContext('2d');
    // Partial street facade: solid room above, open timber undercroft below.
    polygon(g,[[18,20],[674,40],[697,661],[2,642]],'#0a1a24');
    for(let x=24;x<671;x+=35){const w=29+random()*4;timber(g,x,37,w,531,random()>.5?'#0d1d27':'#102029','#24313a');}
    g.fillStyle='rgba(0,5,12,.20)';g.fillRect(10,23,655,547);
    paperWindow(g,57,81,128,356);paperWindow(g,289,99,152,337);paperWindow(g,502,118,111,317);
    for(const [x,y,w,h] of [[23,15,27,1019],[229,19,34,944],[640,28,34,995]])timber(g,x,y,w,h,'#081720','#1c2d37');
    timber(g,10,38,682,30,'#07131e');timber(g,12,458,681,25,'#071720');
    // Thick balcony deck with uneven upper rails and mortise details.
    timber(g,-8,625,725,42,'#04111a');timber(g,7,669,695,17,'#071822');
    timber(g,-5,486,720,20,'#081820');timber(g,3,602,711,17,'#061620');
    const xs=[13,63,123,182,244,302,362,419,479,539,598,666,704];
    for(let i=0;i<xs.length;i++){const x=xs[i],hh=135+(i%3)*3;timber(g,x,476,11,hh,'#06161f');if(i%3===0){timber(g,x-3,468,18,7,'#0b1b24');timber(g,x+2,445,7,24,'#0b1a22');}}
    for(let i=0;i<xs.length-1;i++){const x=xs[i]+11,xx=xs[i+1];stroke(g,x,538,xx,538,'#06151f',6);stroke(g,x,581,xx,581,'#071822',5);if(i%2===0){stroke(g,x,510,xx,580,'#061620',6);}}
    for(const x of [19,230,641]){
      polygon(g,[[x+22,680],[x+123,680],[x+100,704],[x+54,720],[x+24,772]],'#06151f');
      stroke(g,x+25,695,x+108,688,'#1a2a34',3);timber(g,x-17,743,74,15,'#071723');
    }
    timber(g,4,836,668,14,'#071824');
    // Edge weathering is a local brush effect, not a whole-scene overlay.
    const shadow=g.createLinearGradient(0,0,730,0);shadow.addColorStop(0,'rgba(0,4,10,.2)');shadow.addColorStop(.56,'rgba(0,4,10,0)');shadow.addColorStop(1,'rgba(0,4,10,.37)');
    g.save();g.globalCompositeOperation='source-atop';g.fillStyle=shadow;g.fillRect(0,0,768,1056);g.restore();texture(c,.12);return c;
  }
  function mid(){
    const c=surface(608,944),g=c.getContext('2d');
    polygon(g,[[31,24],[573,30],[586,918],[20,916]],'#1b303b');
    for(let y=278;y<914;y+=27){for(let x=20+(Math.floor(y/27)%2)*33;x<580;x+=70){stroke(g,x,y,x+64,y,'rgba(58,70,72,.22)',2);stroke(g,x,y,x,y+23,'rgba(7,24,36,.33)',2);}}
    for(const x of [45,154,269,384,504])paperWindow(g,x,92,52,86,true);
    for(const x of [25,183,369,557])timber(g,x,32,15,211,'#122833','#30424b');
    timber(g,7,198,594,28,'#102632','#2b414d');timber(g,10,237,591,13,'#152d39','#304451');
    // Warm opening follows the reference's arched silhouette and recession.
    const arch=(x,y,w,h)=>{g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+w*.58);g.bezierCurveTo(x,y-w*.05,x+w,y-w*.05,x+w,y+w*.58);g.lineTo(x+w,y+h);g.closePath();};
    arch(228,285,204,539);g.fillStyle='#0b2230';g.fill();
    arch(243,306,174,518);const light=g.createLinearGradient(243,306,416,840);light.addColorStop(0,'#7c654c');light.addColorStop(.52,'#a9824f');light.addColorStop(1,'#c49a58');g.fillStyle=light;g.fill();
    for(let i=0;i<22;i++){g.fillStyle='rgba(190,145,78,.018)';g.fillRect(257+random()*135,521+random()*291,12+random()*20,30+random()*60);}
    for(let y=824;y<920;y+=18)timber(g,210-(y-824)*.22,y,236+(y-824)*.45,13,'#22313a','#45504d');
    texture(c,.055);return c;
  }
  return {nearFacade:near(),midFacade:mid()};
}
