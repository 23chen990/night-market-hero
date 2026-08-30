import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(directory: string) { await mkdir(directory, { recursive: true }); }
export async function writeJsonAtomic(file: string, value: unknown) {
  await ensureDir(path.dirname(file));
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}
export async function readJson(file: string): Promise<unknown> { return JSON.parse(await readFile(file, 'utf8')); }
export async function sha256File(file: string) { return createHash('sha256').update(await readFile(file)).digest('hex'); }
export function sha256Text(text: string) { return createHash('sha256').update(text).digest('hex'); }
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
