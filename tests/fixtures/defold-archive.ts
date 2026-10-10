import { createHash } from 'node:crypto';

function varint(value: number): Buffer {
  const bytes: number[] = [];
  let rest = value;
  while (rest >= 0x80) {
    bytes.push((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  bytes.push(rest);
  return Buffer.from(bytes);
}

export function protobufBytesField(fieldNumber: number, payload: Buffer): Buffer {
  return Buffer.concat([varint((fieldNumber << 3) | 2), varint(payload.length), payload]);
}

/** Defold LuaModule { LuaSource source = 1 } with LuaSource { bytes script = 1; string filename = 2 }. */
export function defoldLuaModule(filename: string, script: string): Buffer {
  return protobufBytesField(1, Buffer.concat([protobufBytesField(1, Buffer.from(script, 'utf8')), protobufBytesField(2, Buffer.from(filename, 'utf8'))]));
}

/** A valid LZ4 block made of one literal-only sequence. */
export function lz4LiteralBlock(data: Buffer): Buffer {
  const header: number[] = [];
  if (data.length < 15) header.push(data.length << 4);
  else {
    header.push(0xf0);
    let rest = data.length - 15;
    while (rest >= 255) { header.push(255); rest -= 255; }
    header.push(rest);
  }
  return Buffer.concat([Buffer.from(header), data]);
}

export type DefoldFixtureEntry = { bytes: Buffer; compress?: boolean; encrypted?: boolean };

/** Version-5 Defold archive index (.arci) and data (.arcd). */
export function defoldArchive(entries: readonly DefoldFixtureEntry[]): { arci: Buffer; arcd: Buffer } {
  const headerSize = 48;
  const hashLength = 20;
  const entryOffset = headerSize + entries.length * 64;
  const arci = Buffer.alloc(entryOffset + entries.length * 16);
  arci.writeUInt32BE(5, 0);
  arci.writeUInt32BE(entries.length, 16);
  arci.writeUInt32BE(entryOffset, 20);
  arci.writeUInt32BE(headerSize, 24);
  arci.writeUInt32BE(hashLength, 28);
  const chunks: Buffer[] = [];
  let offset = 0;
  entries.forEach((entry, index) => {
    createHash('sha1').update(`entry-${index}`).digest().copy(arci, headerSize + index * 64);
    const stored = entry.compress ? lz4LiteralBlock(entry.bytes) : entry.bytes;
    const base = entryOffset + index * 16;
    arci.writeUInt32BE(offset, base);
    arci.writeUInt32BE(entry.bytes.length, base + 4);
    arci.writeUInt32BE(entry.compress ? stored.length : 0xffffffff, base + 8);
    arci.writeUInt32BE((entry.encrypted ? 1 : 0) | (entry.compress ? 2 : 0), base + 12);
    chunks.push(stored);
    offset += stored.length;
  });
  return { arci, arcd: Buffer.concat(chunks) };
}
