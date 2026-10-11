import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(directory: string) { await mkdir(directory, { recursive: true }); }
export async function writeJsonAtomic(file: string, value: unknown) {
  await ensureDir(path.dirname(file));
  // A per-call nonce avoids two concurrent stage resumptions clobbering the
  // same process-scoped temporary file. Rename remains atomic on the target
  // filesystem, and a failed write cleans up its own temporary path.
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}
export async function readJson(file: string): Promise<unknown> { return JSON.parse(await readFile(file, 'utf8')); }
export async function sha256File(file: string) { return createHash('sha256').update(await readFile(file)).digest('hex'); }
export function sha256Text(text: string | Uint8Array) { return createHash('sha256').update(text).digest('hex'); }
/**
 * Hash a run-local directory without decoding its contents.  Directory inputs
 * are part of a work-spec just like files (for example a built `dist/`
 * tree), so their identity must be deterministic and byte based. Symlinks and
 * special entries are rejected instead of being followed implicitly.
 */
export async function sha256Directory(directory: string): Promise<string> {
  const entries: string[] = [];
  const walk = async (current: string, relative = ''): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const info = await lstat(child);
      if (info.isSymbolicLink()) throw new Error(`cannot hash a symlink: ${childRelative}`);
      if (info.isDirectory()) await walk(child, childRelative);
      else if (info.isFile()) entries.push(`${childRelative}:${await sha256File(child)}`);
      else throw new Error(`cannot hash a non-regular entry: ${childRelative}`);
    }
  };
  await walk(directory);
  return sha256Text(entries.sort().join('\n'));
}
export async function copyTree(source: string, destination: string) {
  await ensureDir(destination);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name); const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to); else await writeFile(to, await readFile(from));
  }
}
export async function listFiles(root: string, base = root): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(file, base)); else output.push(path.relative(base, file));
  }
  return output.sort();
}
export async function exists(file: string) { try { await stat(file); return true; } catch { return false; } }
export async function clearDir(directory: string) { await rm(directory, { recursive: true, force: true }); await ensureDir(directory); }
