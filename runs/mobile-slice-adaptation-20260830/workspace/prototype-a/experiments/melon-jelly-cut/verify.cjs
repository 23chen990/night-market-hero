const fs=require('node:fs'),path=require('node:path'),{Linter}=require('eslint');
const file=path.join(__dirname,'melon-jelly.html'),html=fs.readFileSync(file,'utf8');
const start=html.indexOf('<script'),code=html.slice(html.indexOf('>',start)+1,html.lastIndexOf('</script>'));
const rules=Object.fromEntries(['no-unreachable','no-dupe-args','no-dupe-class-members','no-duplicate-case','no-invalid-regexp','no-unsafe-finally','constructor-super','valid-typeof','no-unexpected-multiline'].map(r=>[r,'error']));
const errors=new Linter().verify(code,[{languageOptions:{ecmaVersion:2022,sourceType:'module'},rules}]);
if(!html.includes('navigator.gpu')||!html.includes('createShaderModule')||!html.includes('/*SIM-BEGIN*/'))throw new Error('Native WebGPU and volumetric simulation required');
if(errors.length){console.error(errors);process.exitCode=1;}else console.log('PASS embedded JavaScript syntax and scoped lint; native WebGPU simulation intact');
