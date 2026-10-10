const INDEX_HEADER_BYTES = 32;
const HASH_SLOT_BYTES = 64;
const ENTRY_BYTES = 16;
const UNCOMPRESSED = 0xffffffff;
const FLAG_ENCRYPTED = 1;
const FLAG_COMPRESSED = 2;
const MAX_ENTRIES = 100_000;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const SCRIPT_EXTENSIONS = ['.lua', '.script', '.gui_script', '.render_script', '.editor_script'];

/** Decode one raw LZ4 block (no frame header) into exactly `outputSize` bytes. */
export function decodeLz4Block(source: Buffer, outputSize: number): Buffer {
  const output = Buffer.alloc(outputSize);
  let input = 0;
  let written = 0;
  const readLength = (base: number) => {
    let length = base;
    if (base !== 15) return length;
    for (;;) {
      if (input >= source.length) throw new Error('LZ4 block ends inside a length field');
      const next = source[input++]!;
      length += next;
      if (next !== 255) return length;
    }
  };
  while (input < source.length) {
    const token = source[input++]!;
    const literals = readLength(token >> 4);
    if (input + literals > source.length || written + literals > outputSize) throw new Error('LZ4 literal run exceeds the declared size');
    source.copy(output, written, input, input + literals);
    input += literals;
    written += literals;
    if (input >= source.length) break;
    if (input + 2 > source.length) throw new Error('LZ4 block ends inside a match offset');
    const offset = source.readUInt16LE(input);
    input += 2;
    if (offset === 0 || offset > written) throw new Error('LZ4 match offset points before the output');
    const matchLength = readLength(token & 0x0f) + 4;
    if (written + matchLength > outputSize) throw new Error('LZ4 match exceeds the declared size');
    for (let index = 0; index < matchLength; index += 1) output[written + index] = output[written - offset + index]!;
    written += matchLength;
  }
  if (written !== outputSize) throw new Error(`LZ4 block decoded ${written} bytes but the index declares size ${outputSize}`);
  return output;
}

type ProtobufField = { field: number; wireType: number; bytes?: Buffer };

function readVarint(buffer: Buffer, start: number): { value: number; next: number } | undefined {
  let value = 0;
  let scale = 1;
  for (let position = start; position < buffer.length && position < start + 10; position += 1) {
    const byte = buffer[position]!;
    value += (byte & 0x7f) * scale;
    if ((byte & 0x80) === 0) return { value, next: position + 1 };
    scale *= 128;
  }
  return undefined;
}

/** Parse one protobuf message level; returns undefined when the bytes are not a well-formed message. */
function readProtobufFields(buffer: Buffer): ProtobufField[] | undefined {
  const fields: ProtobufField[] = [];
  let position = 0;
  while (position < buffer.length) {
    const key = readVarint(buffer, position);
    if (!key || key.value === 0) return undefined;
    const field = Math.floor(key.value / 8);
    const wireType = key.value % 8;
    position = key.next;
    if (wireType === 0) {
      const value = readVarint(buffer, position);
      if (!value) return undefined;
      position = value.next;
      fields.push({ field, wireType });
    } else if (wireType === 1 || wireType === 5) {
      position += wireType === 1 ? 8 : 4;
      if (position > buffer.length) return undefined;
      fields.push({ field, wireType });
    } else if (wireType === 2) {
      const length = readVarint(buffer, position);
      if (!length || length.next + length.value > buffer.length) return undefined;
      fields.push({ field, wireType, bytes: buffer.subarray(length.next, length.next + length.value) });
      position = length.next + length.value;
    } else return undefined;
  }
  return fields;
}

function bytesField(fields: ProtobufField[], field: number) {
  return fields.find((candidate) => candidate.field === field && candidate.wireType === 2)?.bytes;
}

function isPlainText(bytes: Buffer) {
  if (bytes.includes(0)) return false;
  return Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes);
}

/** Map an embedded Defold resource name to a safe relative script path. */
export function safeDefoldScriptPath(name: string): string | undefined {
  const trimmed = name.trim().replace(/^@/u, '').replace(/^\/+/u, '');
  if (!trimmed || trimmed.includes('\\')) return undefined;
  const segments = trimmed.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return undefined;
  const safe = segments.map((segment) => segment.replace(/[^A-Za-z0-9._-]+/gu, '-')).join('/');
  if (!SCRIPT_EXTENSIONS.some((extension) => safe.endsWith(extension))) return undefined;
  return safe;
}

/** Recognize a compiled Defold LuaModule whose source is shipped as plain text. */
function luaModuleSource(bytes: Buffer): { name: string; source: Buffer } | undefined {
  const outer = readProtobufFields(bytes);
  const sourceMessage = outer && bytesField(outer, 1);
  const inner = sourceMessage && readProtobufFields(sourceMessage);
  if (!inner) return undefined;
  const script = bytesField(inner, 1);
  const filename = bytesField(inner, 2);
  if (!script || !filename || !isPlainText(filename) || !isPlainText(script)) return undefined;
  return { name: filename.toString('utf8'), source: script };
}

export type DefoldScriptExtraction = {
  entryCount: number;
  compressedCount: number;
  encryptedCount: number;
  unsafeNameCount: number;
  scripts: Array<{ name: string; source: Buffer }>;
};

/** Read every plain-text Lua module from a Defold resource archive. */
export function extractDefoldScripts(input: { arci: Buffer; arcd: Buffer }): DefoldScriptExtraction {
  const { arci, arcd } = input;
  if (arci.length < INDEX_HEADER_BYTES) throw new Error('Defold archive index is truncated');
  const entryCount = arci.readUInt32BE(16);
  const entryOffset = arci.readUInt32BE(20);
  const hashOffset = arci.readUInt32BE(24);
  if (entryCount > MAX_ENTRIES) throw new Error('Defold archive index declares too many entries');
  if (entryOffset + entryCount * ENTRY_BYTES > arci.length || hashOffset + entryCount * HASH_SLOT_BYTES > arci.length) throw new Error('Defold archive index is truncated');
  let compressedCount = 0;
  let encryptedCount = 0;
  let unsafeNameCount = 0;
  const scripts = new Map<string, Buffer>();
  for (let index = 0; index < entryCount; index += 1) {
    const base = entryOffset + index * ENTRY_BYTES;
    const offset = arci.readUInt32BE(base);
    const size = arci.readUInt32BE(base + 4);
    const compressedSize = arci.readUInt32BE(base + 8);
    const flags = arci.readUInt32BE(base + 12);
    const compressed = (flags & FLAG_COMPRESSED) !== 0 && compressedSize !== UNCOMPRESSED;
    const storedSize = compressed ? compressedSize : size;
    if (size > MAX_ENTRY_BYTES || storedSize > MAX_ENTRY_BYTES) throw new Error(`Defold archive entry ${index} is too large`);
    if (offset + storedSize > arcd.length) throw new Error(`Defold archive entry ${index} points outside the archive data`);
    if (compressed) compressedCount += 1;
    if ((flags & FLAG_ENCRYPTED) !== 0) {
      encryptedCount += 1;
      continue;
    }
    const stored = arcd.subarray(offset, offset + storedSize);
    const bytes = compressed ? decodeLz4Block(stored, size) : stored;
    const module = luaModuleSource(bytes);
    if (!module) continue;
    const safe = safeDefoldScriptPath(module.name);
    if (safe === undefined) {
      if (SCRIPT_EXTENSIONS.some((extension) => module.name.endsWith(extension))) unsafeNameCount += 1;
      continue;
    }
    if (!scripts.has(safe)) scripts.set(safe, Buffer.from(module.source));
  }
  return {
    entryCount,
    compressedCount,
    encryptedCount,
    unsafeNameCount,
    scripts: [...scripts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, source]) => ({ name, source })),
  };
}
