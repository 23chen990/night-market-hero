import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { captureReferenceCode } from '../../src/core/reference-code.js';
import { defoldArchive, defoldLuaModule } from '../fixtures/defold-archive.js';

const roots: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const RULES = 'local M = {}\nfunction M.pay(site)\n  return site\nend\nreturn M\n';

async function referenceServer(options: { defold: boolean }) {
  const { arci, arcd } = defoldArchive([
    { bytes: defoldLuaModule('/main/rules.lua', RULES), compress: true },
    { bytes: defoldLuaModule('main/controller.script', 'function init(self)\nend\n') },
    { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  ]);
  const projectc = Buffer.from('[project]\ntitle = Sample\n');
  const split = 16;
  const files = new Map<string, Buffer>([
    ['/build/archive/game0.arcd', arcd.subarray(0, split)],
    ['/build/archive/game1.arcd', arcd.subarray(split)],
    ['/build/archive/game0.arci', arci],
    ['/build/archive/game0.projectc', projectc],
  ]);
  const archiveFiles = JSON.stringify({
    content: [
      { name: 'game.projectc', size: projectc.length, pieces: [{ name: 'game0.projectc', offset: 0 }] },
      { name: 'game.arci', size: arci.length, pieces: [{ name: 'game0.arci', offset: 0 }] },
      { name: 'game.arcd', size: arcd.length, pieces: [{ name: 'game0.arcd', offset: 0 }, { name: 'game1.arcd', offset: split }] },
    ],
    total_size: projectc.length + arci.length + arcd.length,
  });
  const gamePage = options.defold
    ? '<!DOCTYPE html><html><head><title>Sample build</title></head><body><script>fetch("archive/archive_files.json").then((r) => r.json());</script></body></html>'
    : '<!DOCTYPE html><html><head><title>Plain page</title></head><body><canvas></canvas></body></html>';
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/portal') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!DOCTYPE html><html><head><title>Portal page</title></head><body><iframe src="/build/index.html"></iframe></body></html>');
      return;
    }
    if (url.pathname === '/build/index.html') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(gamePage);
      return;
    }
    if (url.pathname === '/build/archive/archive_files.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(archiveFiles);
      return;
    }
    const file = files.get(url.pathname);
    if (file && !request.headers.referer?.includes('/build/index.html')) {
      response.writeHead(403);
      response.end();
      return;
    }
    if (file) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(file);
      return;
    }
    response.writeHead(404);
    response.end();
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/portal`, base: `http://127.0.0.1:${port}/build/archive/`, arcd, arci };
}

async function runFixture() {
  const runRoot = await mkdtemp(path.join(tmpdir(), 'reference-code-capture-'));
  roots.push(runRoot);
  return { runRoot, workspace: path.join(runRoot, 'workspace/game') };
}

describe('reference code capture', () => {
  it('downloads a Defold build from an embedded frame, assembles split files, and extracts scripts', async () => {
    const reference = await referenceServer({ defold: true });
    const { runRoot, workspace } = await runFixture();

    const result = await captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: reference.url, packageId: 'sample', waitSeconds: 20 });

    expect(result.reused).toBe(false);
    expect(result.package).toMatchObject({
      status: 'READY', engine: 'defold', buildBaseUrl: reference.base, pageTitle: 'Portal page', targetGame: 'beach-game', workspace,
      archive: { entryCount: 3, compressedCount: 1, encryptedCount: 0, unsafeNameCount: 0, scriptCount: 2 },
    });
    const arcd = result.package.downloads.find((download) => download.name === 'game.arcd')!;
    expect(arcd).toMatchObject({ urls: [`${reference.base}game0.arcd`, `${reference.base}game1.arcd`], path: 'reference-code/sample/raw/game.arcd', sha256: sha256(reference.arcd), bytes: reference.arcd.length });
    expect(await readFile(path.join(runRoot, arcd.path))).toEqual(reference.arcd);
    expect(result.package.downloads.map((download) => download.name).sort()).toEqual(['archive_files.json', 'game.arcd', 'game.arci', 'game.projectc']);
    const rules = result.package.scripts.find((script) => script.originalName === 'main/rules.lua')!;
    expect(rules).toMatchObject({ path: 'reference-code/sample/scripts/main/rules.lua', sha256: sha256(RULES), lineCount: 5 });
    expect(await readFile(path.join(runRoot, rules.path), 'utf8')).toBe(RULES);
    expect(JSON.parse(await readFile(result.indexPath, 'utf8'))).toEqual(JSON.parse(JSON.stringify(result.package)));
  });

  it('records a BLOCKED package when no supported engine build is requested', async () => {
    const reference = await referenceServer({ defold: false });
    const { runRoot, workspace } = await runFixture();
    const result = await captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: reference.url, packageId: 'plain', waitSeconds: 2 });
    expect(result.package).toMatchObject({ status: 'BLOCKED', engine: null, scripts: [], blockers: ['reference-code:engine-not-detected'] });
  });

  it('reuses an unchanged READY package and refuses one that was modified', async () => {
    const reference = await referenceServer({ defold: true });
    const { runRoot, workspace } = await runFixture();
    const first = await captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: reference.url, packageId: 'sample', waitSeconds: 20 });
    const again = await captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: reference.url, packageId: 'sample', waitSeconds: 20 });
    expect(again).toMatchObject({ reused: true });
    expect(again.package).toEqual(first.package);

    await writeFile(path.join(runRoot, first.package.scripts[0]!.path), '-- edited\n');
    await expect(captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: reference.url, packageId: 'sample', waitSeconds: 20 })).rejects.toThrow(/modified/i);
    await expect(captureReferenceCode({ runRoot, targetGame: 'beach-game', workspace, url: `${reference.url}?other`, packageId: 'sample', waitSeconds: 20 })).rejects.toThrow(/different url/i);
  });
});
