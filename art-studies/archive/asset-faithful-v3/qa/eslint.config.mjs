import js from '@eslint/js';
export default [{ files:['**/scene.js'], ...js.configs.recommended, languageOptions:{ecmaVersion:2022,sourceType:'script',globals:{document:'readonly',window:'readonly',Image:'readonly',console:'readonly',requestAnimationFrame:'readonly',MATERIAL_DATA:'readonly'}},rules:{...js.configs.recommended.rules,'no-unused-vars':['error',{args:'none'}]} }];
