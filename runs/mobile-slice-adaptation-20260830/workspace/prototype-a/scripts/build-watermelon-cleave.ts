import { readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'experiments/watermelon-cleave/dist');
await build({ root, publicDir: false, logLevel: 'warn', build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: resolve(root, 'watermelon-cleave.html') } } });
const assets = resolve(dist, 'assets');
const scriptName = (await readdir(assets)).find(name => name.endsWith('.js'));
if (!scriptName) throw new Error('Missing watermelon preview entrypoint');
const script = (await readFile(resolve(assets, scriptName), 'utf8')).replaceAll('</script', '<\\/script');
let html = await readFile(resolve(dist, 'watermelon-cleave.html'), 'utf8');
html = html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, () => `<script type="module">${script}</script>`);
if (/<script[^>]+src=|<link[^>]+href=/i.test(html)) throw new Error('Preview has external build references');
await writeFile(resolve(dist, 'index.html'), html);
await copyFile(resolve(root, 'node_modules/three/LICENSE'), resolve(dist, 'THREE-MIT-LICENSE.txt'));
await rm(resolve(dist, 'watermelon-cleave.html'));
await rm(assets, { recursive: true });
const manifest = {
  targetGame: 'mobile-slice-adaptation-20260830', workspace: root,
  scope: 'single-watermelon-effect-preview', defaultGameReplaced: false,
  entrypoint: 'index.html', runtimeSources: ['watermelon-cleave.html', 'src/watermelon-cleave-demo.ts', 'src/watermelon-cleave.ts', 'src/cut-plane-geometry.ts'],
  sha256: createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html),
};
await writeFile(resolve(dist, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest));
