import { describe, expect, it } from 'vitest';
import { decodeLz4Block, extractDefoldScripts, safeDefoldScriptPath } from '../../src/core/reference-code-defold.js';
import { defoldArchive, defoldLuaModule, protobufBytesField } from '../fixtures/defold-archive.js';

describe('Defold archive script extraction', () => {
  it('extracts plain-text Lua modules from compressed and uncompressed entries', () => {
    const { arci, arcd } = defoldArchive([
      { bytes: defoldLuaModule('/main/game.script', 'function init(self)\nend\n') },
      { bytes: defoldLuaModule('main/rules.lua', 'local M = {}\nreturn M\n'), compress: true },
      { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) },
      { bytes: Buffer.from('sealed bytes'), encrypted: true, compress: true },
    ]);

    const result = extractDefoldScripts({ arci, arcd });

    expect(result).toMatchObject({ entryCount: 4, compressedCount: 2, encryptedCount: 1, unsafeNameCount: 0 });
    expect(result.scripts.map((script) => [script.name, script.source.toString('utf8')])).toEqual([
      ['main/game.script', 'function init(self)\nend\n'],
      ['main/rules.lua', 'local M = {}\nreturn M\n'],
    ]);
  });

  it('decodes an LZ4 back-reference that overlaps its own output', () => {
    const block = Buffer.from([0x22, 0x61, 0x62, 0x02, 0x00]);
    expect(decodeLz4Block(block, 8).toString('utf8')).toBe('abababab');
  });

  it('rejects an LZ4 block whose decoded size differs from the index', () => {
    expect(() => decodeLz4Block(Buffer.from([0x30, 0x61, 0x62, 0x63]), 4)).toThrow(/size/i);
  });

  it('drops modules whose embedded name would escape the scripts directory', () => {
    const { arci, arcd } = defoldArchive([{ bytes: defoldLuaModule('main/../../etc/evil.lua', 'return 1\n') }]);
    const result = extractDefoldScripts({ arci, arcd });
    expect(result.unsafeNameCount).toBe(1);
    expect(result.scripts).toEqual([]);
  });

  it('ignores protobuf-shaped entries that are not Lua modules', () => {
    const { arci, arcd } = defoldArchive([
      { bytes: protobufBytesField(1, protobufBytesField(1, Buffer.from('no filename'))) },
      { bytes: defoldLuaModule('main/image.png', 'not a script') },
    ]);
    expect(extractDefoldScripts({ arci, arcd }).scripts).toEqual([]);
  });

  it('rejects an index entry that points outside the data file', () => {
    const { arci, arcd } = defoldArchive([{ bytes: defoldLuaModule('main/a.lua', 'return 1\n') }]);
    expect(() => extractDefoldScripts({ arci, arcd: arcd.subarray(0, 4) })).toThrow(/outside the archive data/i);
  });

  it('rejects a truncated archive index', () => {
    expect(() => extractDefoldScripts({ arci: Buffer.alloc(12), arcd: Buffer.alloc(0) })).toThrow(/index/i);
  });

  it('normalizes embedded script names to safe relative paths', () => {
    expect(safeDefoldScriptPath('@main/gamecore/Player.lua')).toBe('main/gamecore/Player.lua');
    expect(safeDefoldScriptPath('/main/gui/popup shop.gui_script')).toBe('main/gui/popup-shop.gui_script');
    expect(safeDefoldScriptPath('main/../secret.lua')).toBeUndefined();
    expect(safeDefoldScriptPath('main/readme.txt')).toBeUndefined();
    expect(safeDefoldScriptPath('')).toBeUndefined();
  });
});
