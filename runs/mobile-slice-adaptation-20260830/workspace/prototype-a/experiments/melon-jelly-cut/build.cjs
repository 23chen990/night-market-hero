const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const input=path.join(__dirname,'melon-jelly.html'),html=fs.readFileSync(input);
const out=path.join(__dirname,'dist');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);
const manifest={entrypoint:'index.html',source:'melon-jelly.html',sha256:crypto.createHash('sha256').update(html).digest('hex'),bytes:html.length,builtAt:new Date().toISOString(),runtime:'native WebGPU browser study',platformPackages:false};
fs.writeFileSync(path.join(out,'build-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
