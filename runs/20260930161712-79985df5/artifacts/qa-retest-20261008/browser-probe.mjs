import { chromium } from '@playwright/test'; import fs from 'node:fs/promises'; import {z} from 'zod';
const b=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--enable-gpu']});
const page=await b.newPage({viewport:{width:540,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4177');await page.waitForSelector('canvas');await page.waitForTimeout(500);
const renderer=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl');if(!gl)return 'no-webgl';const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)});
const captures=[];for(let i=0;i<3;i++){const start=Date.now();await page.screenshot({timeout:30000});captures.push(Date.now()-start);}
await b.close();
const data=z.object({schemaVersion:z.literal(1),classification:z.literal('QA_INFRASTRUCTURE'),renderer:z.string(),captureMs:z.array(z.number()),errors:z.array(z.string())}).strict().parse({schemaVersion:1,classification:'QA_INFRASTRUCTURE',renderer,captureMs:captures,errors});await fs.writeFile(new URL('./browser-probe.json',import.meta.url),JSON.stringify(data,null,2));console.log(JSON.stringify(data));
