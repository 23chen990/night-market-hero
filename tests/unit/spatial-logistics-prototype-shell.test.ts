import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readPrototype(relativePath: string): Promise<string | null> {
  return readFile(path.join(process.cwd(), 'prototypes/spatial-logistics-core', relativePath), 'utf8').catch(() => null);
}

describe('spatial logistics playable shell', () => {
  it('boots a Phaser scene around the tested simulation and exposes deterministic controls', async () => {
    const source = await readPrototype('src/main.ts');
    expect(source, 'the playable Phaser entrypoint should exist').not.toBeNull();
    if (!source) return;
    expect(source).toContain('new Phaser.Game');
    expect(source).toContain('advanceGame');
    expect(source).toContain('joystickMove');
    expect(source).toContain('__GAME_TEST__');
  });

  it('reads the actual WASD keys returned by Phaser addKeys', async () => {
    const source = await readPrototype('src/main.ts');
    expect(source, 'the playable Phaser entrypoint should exist').not.toBeNull();
    if (!source) return;
    expect(source).toContain('this.keys.wasd.A.isDown');
    expect(source).toContain('this.keys.wasd.D.isDown');
    expect(source).not.toContain('this.keys.wasd.left.isDown');
  });

  it('does not flash the entire camera for repeating automatic interactions', async () => {
    const source = await readPrototype('src/main.ts');
    expect(source, 'the playable Phaser entrypoint should exist').not.toBeNull();
    if (!source) return;
    expect(source).not.toContain('cameras.main.flash');
  });

  it('provides a responsive canvas mount and visible instructions', async () => {
    const html = await readPrototype('index.html');
    const style = await readPrototype('src/style.css');
    expect(html, 'the prototype page should exist').not.toBeNull();
    expect(style, 'the responsive prototype styles should exist').not.toBeNull();
    expect(html).toContain('id="game"');
    expect(html).toContain('WASD');
    expect(style).toContain('touch-action: none');
  });

  it('explains how to launch the prototype when index.html is opened as a file', async () => {
    const html = await readPrototype('index.html');
    expect(html, 'the prototype page should exist').not.toBeNull();
    if (!html) return;
    expect(html).toContain("window.location.protocol === 'file:'");
    expect(html).toContain('不能直接双击 index.html');
    expect(html).toContain('打开游戏.command');
  });

  it('provides a macOS one-click launcher that serves and opens the game', async () => {
    const launcher = await readPrototype('打开游戏.command');
    expect(launcher, 'the macOS launcher should exist').not.toBeNull();
    if (!launcher) return;
    expect(launcher).toContain('vite');
    expect(launcher).toContain('--host 127.0.0.1');
    expect(launcher).toContain('--open');
  });
});
