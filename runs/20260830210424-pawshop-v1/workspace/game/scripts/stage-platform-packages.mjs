import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative);
    return [relative];
  }));
  return nested.flat();
}
const files = await listFiles(path.join(root, 'dist'));
const sourceRoot = path.join(root, 'dist');
const contents = await Promise.all(files.map(async (file) => {
  const raw = await readFile(path.join(sourceRoot, file));
  const bytes = file === 'index.html'
    ? Buffer.from(raw.toString('utf8').replaceAll('"/assets/', '"assets/').replaceAll("'/assets/", "'assets/"))
    : raw;
  return { file, bytes };
}));
const webHash = createHash('sha256');
contents.forEach(({ file, bytes }) => webHash.update(file).update('\0').update(bytes));
const sha256 = webHash.digest('hex');
const manifests = [];
for (const platform of ['wechat', 'douyin', 'taptap']) {
  const buildDir = path.join(root, 'platforms', `${platform}-minigame`, 'build');
  await mkdir(buildDir, { recursive: true });
  await Promise.all(contents.map(({ file, bytes }) => mkdir(path.dirname(path.join(buildDir, file)), { recursive: true }).then(() => writeFile(path.join(buildDir, file), bytes))));
  const adapter = await readFile(path.join(root, 'platforms', `${platform}-minigame`, 'adapter.ts'));
  const config = await readFile(path.join(root, 'platforms', `${platform}-minigame`, 'build-config.json'));
  await writeFile(path.join(buildDir, 'adapter.ts'), adapter);
  await writeFile(path.join(buildDir, 'build-config.json'), config);
  const platformHash = createHash('sha256');
  contents.forEach(({ file, bytes }) => platformHash.update(file).update('\0').update(bytes));
  platformHash.update('adapter.ts\0').update(adapter).update('build-config.json\0').update(config);
  const manifest = { schemaVersion: 1, platform, files: [...files, 'adapter.ts', 'build-config.json'], sha256: platformHash.digest('hex'), webSha256: sha256, status: 'staged-web-lite-adapter', publishable: false };
  manifests.push(manifest);
  await writeFile(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
console.log(JSON.stringify({ platforms: manifests, files, status: 'staged-web-lite-adapter' }));
