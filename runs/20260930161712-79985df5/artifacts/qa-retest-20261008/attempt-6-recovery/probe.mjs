import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {Driver,observeDom} from './qa-lib.mjs';
const out=fileURLToPath(new URL('./pilot',import.meta.url));
const b=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
try{const c=await b.newContext({viewport:{width:540,height:960}}),p=await c.newPage();await p.goto('http://127.0.0.1:4175/?qa=probe6');await p.waitForSelector('#game canvas');await observeDom(p);const d=new Driver(p,out);await p.waitForTimeout(400);console.log(await d.player());await d.capture('boot');await d.move({x:120,y:180},'net');await d.idle(900,'cargo');await d.move({x:270,y:420},'fish-shelf');await d.idle(900,'stock');await d.move({x:270,y:640},'checkout');await d.idle(2500,'service');await d.move({x:70,y:640},'leave');await d.move({x:270,y:640},'return');await d.idle(400,'collected');}finally{await b.close();}
