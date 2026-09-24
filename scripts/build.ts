import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');
const playableAlias = resolve(root, '夜市飞侠-护印突围-试玩版.html');

await build({
  root,
  logLevel: 'warn',
  build: { outDir: dist, emptyOutDir: true, cssCodeSplit: false, chunkSizeWarningLimit: 2_000 },
});

const assetDirectory = resolve(dist, 'assets');
const assets = await readdir(assetDirectory);
const scriptName = assets.find((name) => name.endsWith('.js'));
const styleName = assets.find((name) => name.endsWith('.css'));
if (!scriptName) throw new Error('Vite did not emit JavaScript');

let html = await readFile(resolve(dist, 'index.html'), 'utf8');
let script = (await readFile(resolve(assetDirectory, scriptName), 'utf8'))
  // Keep third-party/runtime template strings from terminating the inline HTML script.
  .replaceAll('</script', '<\\/script')
  .replaceAll('</body', '<\\/body')
  .replaceAll('</foreignObject', '<\\/foreignObject')
  .replaceAll('</svg', '<\\/svg');

// `longmap-art-catalog.ts` intentionally keeps its component paths as
// runtime-relative URLs so the source module remains importable in Node-based
// tests. Vite cannot discover those files through the catalog's dynamic
// `new URL(path, import.meta.url)` call, so inline the declared component
// sources explicitly while producing the classic, self-contained playable.
const catalogSource = await readFile(resolve(root, 'src/longmap-art-catalog.ts'), 'utf8');
const catalogAssetPaths = [...catalogSource.matchAll(/(['"`])(\.\/assets\/[^'"`]+\.(?:png|webp|jpg|jpeg))\1/g)]
  .map((match) => match[2]!)
  .filter((path, index, paths) => paths.indexOf(path) === index);
for (const relativePath of catalogAssetPaths) {
  const assetPath = resolve(root, 'src', relativePath.slice(2));
  const extension = relativePath.split('.').pop()?.toLowerCase();
  const mime = extension === 'webp' ? 'image/webp' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
  const data = `data:${mime};base64,${(await readFile(assetPath)).toString('base64')}`;
  script = script.replaceAll(relativePath, data);
}
for (const asset of assets.filter((name) => /\.(png|webp|jpg|jpeg)$/i.test(name))) {
  const mime = asset.endsWith('.webp') ? 'image/webp' : asset.endsWith('.jpg') || asset.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  const data = `data:${mime};base64,${(await readFile(resolve(assetDirectory, asset))).toString('base64')}`;
  script = script.replaceAll(`assets/${asset}`, data);
  script = script.replaceAll(asset, data);
  html = html.replaceAll(`assets/${asset}`, data);
}
script = script.replace(/new URL\(`(data:image\/(?:png|webp|jpeg);base64,[^`]+)`,import\.meta\.url\)\.href/g, '`$1`');
// Vite may split a concatenated URL into an empty template plus the inlined
// data URL (`new URL(``+`data:...`,``+import.meta.url).href).  The final
// self-contained playable is a classic script, so every such form must become
// the plain data URL before it is embedded.
script = script.replace(/new URL\(``\+`(data:image\/(?:png|webp|jpeg);base64,[^`]+)`,``\+import\.meta\.url\)\.href/g, '`$1`');
// The catalog's dynamic path is now a data URL for every available component
// asset. Strip the module-only base resolution from the classic script.
script = script.replace(/new URL\(([A-Za-z_$][\w$]*),import\.meta\.url\)\.href/g, '$1');
html = html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, '');
const closingBody = html.lastIndexOf('</body>');
if (closingBody < 0) throw new Error('Build HTML is missing a closing body tag');
html = `${html.slice(0, closingBody)}<script>${script}</script>\n  </body>${html.slice(closingBody + '</body>'.length)}`;
// Defensive pass for runtime bundles that contain a closing-body token in a template literal.
html = html.replaceAll('</body>&', '<\\/body>&');
if (styleName) {
  const style = await readFile(resolve(assetDirectory, styleName), 'utf8');
  html = html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, `<style>${style}</style>`);
}
if (/<script[^>]+src=|<link[^>]+href=/i.test(html)) throw new Error('Build contains external references');
await writeFile(resolve(dist, 'index.html'), html);
await writeFile(playableAlias, html);
await rm(assetDirectory, { recursive: true, force: true });
console.log(`built self-contained dist/index.html and ${playableAlias} (${Buffer.byteLength(html)} bytes)`);
