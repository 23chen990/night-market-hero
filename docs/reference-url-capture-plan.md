# 参考游戏网址采集：执行计划（首版）

给执行者：严格按顺序做，每一步做完再做下一步。不要自由发挥，不要做本文没写的事。遇到本文没覆盖的情况，停下来报告，不要猜。

## 0. 目标（一句话）

新增命令 `pnpm factory capture-reference-url <run-id> --url <网址> --capture-id <id>`：用 Playwright 打开一个 H5 游戏网址，按固定帧率截图、按脚本执行点击/拖拽/按键，把结果写成一个索引文件并以 `PENDING` 状态入库。人工复核通过后，现有的 `extract-reference-frames` 和研究阶段能直接使用这份采集，就像使用录屏一样。

## 1. 硬性规则（违反任何一条都算失败）

1. 这是共享工厂代码改动。不要修改 `runs/` 目录下的任何文件，不要修改任何 `runs/<id>/workspace`。
2. 不要新增任何依赖。`package.json` 不许改。Playwright 从 `@playwright/test` 导入（仓库已有）。
3. 不要提交 git，不要 `git add`、`git commit`、`git stash`、`git checkout`。
4. 先写测试，再写实现。每一步的测试先跑一次确认失败，再写代码让它通过。
5. 不要下载或保存网页里的图片、音频、脚本正文。资源只记录 URL、类型、状态码、MIME、大小。
6. 采集器不能把证据标为可用。入库后必须是 `PENDING`，只有人工执行 `pnpm evidence:review` 才能变成 `VERIFIED`。
7. 不要修改 `src/schemas/evidence-provenance.ts`。
8. 只改下面“文件清单”里列出的文件。
9. 首版不做：自动探测玩法、读取发布包配置、联系表（contact sheet）、录视频、ffmpeg。

## 2. 文件清单

| 文件 | 动作 |
|---|---|
| `src/schemas/reference-web-capture.ts` | 新建 |
| `src/core/reference-web-capture.ts` | 新建 |
| `src/core/evidence-provenance.ts` | 修改：`ingestReferenceMedia` 加一个参数 |
| `src/schemas/reference-recording.ts` | 修改：两个枚举各加一项 |
| `src/core/reference-recording.ts` | 修改：支持采集索引作为抽帧来源 |
| `src/factory.ts` | 修改：第 383 行过滤条件；新增 `captureReferenceUrl` 方法 |
| `src/cli/factory.ts` | 修改：新增 `capture-reference-url` 命令 |
| `tests/unit/reference-web-capture-schema.test.ts` | 新建 |
| `tests/unit/reference-recording.test.ts` | 修改：追加测试 |
| `tests/unit/evidence-provenance-ingest-option.test.ts` | 新建 |
| `tests/e2e/reference-web-capture.test.ts` | 新建 |
| `README.md` | 修改：在“若 `gameplay-reference` 是录屏”那段之后加一小节用法 |

## 3. 关键约定（所有步骤都依赖这些，不要改）

- 采集目录：`<runRoot>/reference-capture/<captureId>/`
- 截图：`<runRoot>/reference-capture/<captureId>/frames/frame-00000.png`，编号 5 位补零，从 0 开始。
- 索引文件名必须是 `reference-web-capture.json`，放在采集目录里。入库后存储名会变成 `reference-web-capture-<sha256前12位>.json`，后面靠这个名字识别采集索引。
- 识别采集索引的正则：`/(?:^|\/)reference-web-capture-[a-f0-9]{12}\.json$/iu`
- 入库证据 id：`web-capture-<captureId>`，用途：`gameplay-reference`。
- `captureId` 只允许：`/^[a-z0-9][a-z0-9-]{0,63}$/`
- 默认值：视口 390×844，设备像素比 1，帧率 4，时长 20 秒。帧数 = `Math.floor(秒数 × 帧率) + 1`，必须在 2 到 900 之间，否则抛错。

## 步骤 1：新建 Schema

### 1a. 先写测试 `tests/unit/reference-web-capture-schema.test.ts`

用 vitest，写这些用例：

1. 一个合法的 READY 索引（2 帧、宽高等于视口、`deviceScaleFactor: 1`）能通过 `ReferenceWebCaptureSchema.parse`。
2. `status: 'READY'` 但只有 1 帧 → 解析失败。
3. `status: 'BLOCKED'` 且 `blockers: []` → 解析失败。
4. 帧的 `index` 不连续（0, 2）→ 解析失败。
5. 帧宽高和视口不一致 → 解析失败。
6. 帧 `path` 以 `/` 开头或含 `..` → 解析失败。
7. `ReferenceCaptureActionListSchema` 接受 tap、drag、key 三种动作；拒绝 `x: 1.5`。
8. `requestedUrl` 为 `file:///tmp/game.html` 能通过；为 `not a url` 失败。
9. `isReferenceWebCapturePath('reference-evidence/verified/reference-web-capture-0123456789ab.json')` 为 `true`；`'reference-evidence/incoming/level.mp4'` 为 `false`。

运行 `pnpm vitest run tests/unit/reference-web-capture-schema.test.ts`，确认失败（文件还不存在）。

### 1b. 新建 `src/schemas/reference-web-capture.ts`，内容照抄：

```ts
import { z } from 'zod';

const Text = z.string().trim().min(1);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/iu);
const RunRelativePath = Text.refine((value) => !value.startsWith('/') && !value.split(/[\\/]/u).includes('..'), 'path must stay relative to the owning run');
const AbsolutePath = Text.refine((value) => value.startsWith('/'), 'path must be absolute');
const Unit = z.number().min(0).max(1);
const Ms = z.number().int().nonnegative();
const ParsableUrl = Text.refine((value) => { try { new URL(value); return true; } catch { return false; } }, 'must be a parsable URL');

export const ReferenceCaptureActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tap'), atMs: Ms, x: Unit, y: Unit }).strict(),
  z.object({ type: z.literal('drag'), atMs: Ms, fromX: Unit, fromY: Unit, toX: Unit, toY: Unit, durationMs: z.number().int().positive().max(5_000) }).strict(),
  z.object({ type: z.literal('key'), atMs: Ms, key: Text }).strict(),
]);
export type ReferenceCaptureAction = z.infer<typeof ReferenceCaptureActionSchema>;
export const ReferenceCaptureActionListSchema = z.array(ReferenceCaptureActionSchema).max(200);

export const ReferenceWebCaptureSchema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('reference-web-capture'),
  captureId: Text,
  targetGame: Text,
  workspace: AbsolutePath,
  requestedUrl: ParsableUrl,
  finalUrl: Text,
  pageTitle: z.string(),
  browser: z.object({ name: z.literal('chromium'), version: Text }).strict(),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), deviceScaleFactor: z.literal(1) }).strict(),
  samplingFps: z.number().positive().max(30),
  durationMs: z.number().int().positive(),
  frames: z.array(z.object({
    index: Ms,
    requestedMs: Ms,
    actualMs: Ms,
    path: RunRelativePath,
    sha256: Sha256,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).strict()).max(900),
  interactions: z.array(z.object({
    order: z.number().int().positive(),
    action: ReferenceCaptureActionSchema,
    actualMs: Ms,
    performed: z.boolean(),
    error: z.string().nullable(),
  }).strict()),
  resources: z.array(z.object({
    url: Text,
    resourceType: Text,
    status: z.number().int(),
    mimeType: z.string(),
    sizeBytes: z.number().int().nonnegative().nullable(),
  }).strict()).max(2_000),
  consoleErrors: z.array(z.string()).max(200),
  status: z.enum(['READY', 'BLOCKED']),
  blockers: z.array(Text),
  capturedAt: z.string().datetime(),
}).strict().superRefine((capture, context) => {
  for (const [index, frame] of capture.frames.entries()) {
    if (frame.index !== index) context.addIssue({ code: 'custom', path: ['frames', index, 'index'], message: 'frame indexes must be contiguous' });
    if (index > 0 && frame.requestedMs <= capture.frames[index - 1]!.requestedMs) context.addIssue({ code: 'custom', path: ['frames', index, 'requestedMs'], message: 'requested timestamps must increase' });
    if (frame.width !== capture.viewport.width || frame.height !== capture.viewport.height) context.addIssue({ code: 'custom', path: ['frames', index], message: 'frame dimensions must match the viewport' });
  }
  if (capture.status === 'READY' && (capture.frames.length < 2 || capture.blockers.length > 0)) context.addIssue({ code: 'custom', path: ['status'], message: 'READY captures require at least two frames and no blockers' });
  if (capture.status === 'BLOCKED' && capture.blockers.length === 0) context.addIssue({ code: 'custom', path: ['blockers'], message: 'BLOCKED captures require blockers' });
});
export type ReferenceWebCapture = z.infer<typeof ReferenceWebCaptureSchema>;

export const REFERENCE_WEB_CAPTURE_INDEX_NAME = 'reference-web-capture.json';
const STORED_CAPTURE_INDEX = /(?:^|\/)reference-web-capture-[a-f0-9]{12}\.json$/iu;
export function isReferenceWebCapturePath(storedPath: string) {
  return STORED_CAPTURE_INDEX.test(storedPath);
}
```

再跑 1a 的测试，必须全部通过。

## 步骤 2：入库时可以不生成分析文本

原因：`ingestReferenceMedia` 遇到 `.json` 会生成 `.analysis.txt`，`src/factory.ts` 第 556 行会把它读进研究阶段，采集索引全是路径和哈希，不能进研究上下文。

### 2a. 先写测试 `tests/unit/evidence-provenance-ingest-option.test.ts`

1. 在临时目录建一个 run，写一个 `reference-web-capture.json`（内容随便一个 JSON）。
2. 调 `ingestReferenceMedia({ sourcePath, runRoot, targetGame: 'g', purpose: 'gameplay-reference', analysisText: false })`。
3. 断言返回值 `analysisTextPath` 为 `undefined`；`reference-evidence/manifest.json` 里这条记录没有 `analysisTextPath`；`reviewStatus` 为 `PENDING`；`usableAsEvidence` 为 `false`；`storedPath` 匹配 `isReferenceWebCapturePath`。
4. 再写一个用例：不传 `analysisText` 时，`.json` 仍会生成 `analysisTextPath`（证明旧行为没变）。

### 2b. 修改 `src/core/evidence-provenance.ts`

在 `ingestReferenceMedia` 的参数类型里加一行 `analysisText?: boolean;`，然后把：

```ts
const analysisSidecar = await writeAnalysisSidecar(source, destination);
```

改成：

```ts
const analysisSidecar = input.analysisText === false ? undefined : await writeAnalysisSidecar(source, destination);
```

只改这两处。跑 2a 测试通过。

## 步骤 3：帧清单 Schema 各加一个枚举值

修改 `src/schemas/reference-recording.ts` 的 `ReferenceFrameManifestSchema`：

- `mediaType: z.enum(['video/mp4', 'video/quicktime'])` 改成 `z.enum(['video/mp4', 'video/quicktime', 'image/png-sequence'])`
- `engine: z.enum(['AVFoundation', 'injected-test-extractor'])` 改成 `z.enum(['AVFoundation', 'injected-test-extractor', 'playwright-screenshot'])`

别的不动。

## 步骤 4：抽帧支持采集索引

### 4a. 先在 `tests/unit/reference-recording.test.ts` 末尾（`describe` 内部）追加测试

写一个新的 fixture 函数 `captureFixture()`：

1. 临时 run 目录，`workspace = <runRoot>/workspace/game`。
2. 写两张假截图 `reference-capture/c1/frames/frame-00000.png`、`frame-00001.png`（内容用任意不同字符串即可，这里不校验 PNG 格式）。
3. 写一个符合 `ReferenceWebCaptureSchema` 的索引对象：`viewport: { width: 390, height: 844, deviceScaleFactor: 1 }`，`samplingFps: 4`，`durationMs: 250`，两帧的 `sha256` 为对应文件内容的真实哈希，`width: 390, height: 844`，`requestedMs` 为 0 和 250。
4. 把索引写到 `reference-evidence/verified/reference-web-capture-aaaaaaaaaaaa.json`，计算这个文件的哈希。
5. 写 `reference-evidence/manifest.json`，一条记录：`id: 'web-capture-c1'`，`storedPath` 为上面路径，`purpose: 'gameplay-reference'`，`identityStatus: 'VERIFIED_TARGET'`，`reviewStatus: 'VERIFIED'`，`usableAsEvidence: true`，`sha256` 为索引文件哈希。

测试用例：

1. 不传 `extractor`，调 `extractReferenceRecordingFrames({ runRoot, targetRunId: 'run-1', expected: { targetGame, workspace }, evidenceId: 'web-capture-c1' })`，断言：`status: 'READY'`，`source.mediaType: 'image/png-sequence'`，`extraction.engine: 'playwright-screenshot'`，`extraction.samplingFps: 4`，`frames.length === 2`，`contactSheets` 为空数组，`source.width === 390`。
2. 再调一次，断言 `reused === true`。
3. 把 `frame-00001.png` 内容改掉后（先删除 `artifacts/reference-frame-manifest.json`）再调，断言 `status: 'BLOCKED'`，`blockers` 里有一条包含 `hash mismatch`。
4. 索引里一帧的 `path` 改成 `../outside.png`（同时重算索引文件哈希并写回 manifest）→ 断言调用抛错。

确认这些测试现在失败。

### 4b. 修改 `src/core/reference-recording.ts`

按顺序做这 6 处改动：

1. 顶部导入加：
   ```ts
   import { copyFile, mkdir } from 'node:fs/promises';
   import { ReferenceWebCaptureSchema, isReferenceWebCapturePath } from '../schemas/reference-web-capture.js';
   ```
   （`copyFile`、`mkdir` 合并进已有的 `node:fs/promises` 导入那一行。）

2. 把 `ReferenceFrameExtractor` 类型改成：
   ```ts
   export type ReferenceFrameExtractor = (input: { sourcePath: string; outputDir: string; fps: number; maxFrames: number; runRoot: string }) => Promise<NativeFrameExtraction>;
   ```

3. 在 `runAvFoundationFrameExtractor` 函数后面新增：
   ```ts
   export const runImageSequenceFrameExtractor: ReferenceFrameExtractor = async ({ sourcePath, outputDir, maxFrames, runRoot }) => {
     const capture = ReferenceWebCaptureSchema.parse(JSON.parse(await readFile(sourcePath, 'utf8')));
     if (capture.status !== 'READY') throw new Error(`web capture is not READY: ${capture.captureId}`);
     await mkdir(outputDir, { recursive: true });
     const frames: NativeFrameExtraction['frames'] = [];
     const failures: NonNullable<NativeFrameExtraction['failures']> = [];
     for (const frame of capture.frames.slice(0, maxFrames)) {
       const file = await verifyRunLocalFile(runRoot, frame.path);
       if (await sha256File(file) !== frame.sha256) {
         failures.push({ requestedMs: frame.requestedMs, message: `capture frame hash mismatch: ${frame.path}` });
         continue;
       }
       const fileName = `frame-${String(frame.index).padStart(5, '0')}.png`;
       await copyFile(file, path.join(outputDir, fileName));
       frames.push({ index: frames.length, requestedMs: frame.requestedMs, actualMs: frame.actualMs, fileName });
     }
     return { durationMs: capture.durationMs, width: capture.viewport.width, height: capture.viewport.height, frames, contactSheets: [], failures };
   };
   ```

4. 在 `extractReferenceRecordingFrames` 里，把：
   ```ts
   if (!/\.(?:mp4|mov)$/iu.test(selected.storedPath)) throw new Error(`gameplay evidence is not a supported recording: ${selected.id}`);
   ```
   改成：
   ```ts
   const isWebCapture = isReferenceWebCapturePath(selected.storedPath);
   if (!isWebCapture && !/\.(?:mp4|mov)$/iu.test(selected.storedPath)) throw new Error(`gameplay evidence is not a supported recording: ${selected.id}`);
   ```

5. 把 `const fps = input.fps ?? 8;` 改成（放在哈希校验那行之后）：
   ```ts
   const fps = isWebCapture
     ? ReferenceWebCaptureSchema.parse(JSON.parse(await readFile(sourcePath, 'utf8'))).samplingFps
     : input.fps ?? 8;
   ```

6. 抽帧器选择、调用和清单字段：
   - `const extractor = input.extractor ?? runAvFoundationFrameExtractor;` 改成 `const extractor = input.extractor ?? (isWebCapture ? runImageSequenceFrameExtractor : runAvFoundationFrameExtractor);`
   - `await extractor({ sourcePath, outputDir, fps, maxFrames })` 改成 `await extractor({ sourcePath, outputDir, fps, maxFrames, runRoot })`
   - `mediaType:` 那一行改成：`mediaType: isWebCapture ? 'image/png-sequence' : path.extname(selected.storedPath).toLowerCase() === '.mov' ? 'video/quicktime' : 'video/mp4',`
   - `engine:` 改成：`engine: input.extractor ? 'injected-test-extractor' : isWebCapture ? 'playwright-screenshot' : 'AVFoundation',`

跑 `pnpm vitest run tests/unit/reference-recording.test.ts`，新旧测试必须全部通过。

## 步骤 5：自动流水线也认采集索引

修改 `src/factory.ts` 第 383 行附近 `ensureReferenceFrameManifest` 里的过滤条件，把：

```ts
/\.(?:mp4|mov)$/iu.test(entry.storedPath)
```

改成：

```ts
(/\.(?:mp4|mov)$/iu.test(entry.storedPath) || isReferenceWebCapturePath(entry.storedPath))
```

并在 `src/factory.ts` 顶部加导入：

```ts
import { isReferenceWebCapturePath, type ReferenceCaptureAction } from './schemas/reference-web-capture.js';
```

## 步骤 6：采集核心

### 6a. 先写 e2e 测试 `tests/e2e/reference-web-capture.test.ts`

测试页面：在临时目录写一个 `game.html`，内容是一个 390×844 的 `<canvas>`，点击时把背景色从蓝改成红，按任意键时画一个方块。用 `pathToFileURL(file).href` 得到 `file://` 网址。

用例：

1. 调 `captureReferenceUrl({ runRoot, targetGame: 'g', workspace, url, captureId: 'c1', durationSeconds: 1, fps: 4, actions: [{ type: 'tap', atMs: 250, x: 0.5, y: 0.5 }] })`。断言：
   - 返回 `capture.status === 'READY'`，`capture.frames.length === 5`
   - 每张截图文件存在，哈希等于索引记录
   - 每张截图 PNG 头里的宽高是 390×844（读字节 16–19 和 20–23，大端）
   - `interactions[0].performed === true`
   - `reference-evidence/manifest.json` 里有 `id: 'web-capture-c1'`，`reviewStatus: 'PENDING'`，`usableAsEvidence: false`，没有 `analysisTextPath`
   - `runRoot` 下除了 `reference-capture/`、`reference-evidence/` 之外没有新文件
2. 同样参数再调一次：返回 `reused: true`，截图文件修改时间没变。
3. 同一 `captureId` 换一个网址：抛错，信息包含 `different url`。
4. 网址是一个不存在的文件：返回 `capture.status === 'BLOCKED'`，`blockers` 有一条以 `page-load-failed:` 开头；manifest 里没有新增记录（BLOCKED 不入库）。
5. `captureId: 'Bad ID'`：抛错。
6. `durationSeconds: 0.1, fps: 4`（只有 1 帧）：抛错。

### 6b. 新建 `src/core/reference-web-capture.ts`

必须导出这个函数，签名照抄：

```ts
export async function captureReferenceUrl(input: {
  runRoot: string;
  targetGame: string;
  workspace: string;
  url: string;
  captureId: string;
  durationSeconds?: number;
  fps?: number;
  viewport?: { width: number; height: number };
  actions?: ReferenceCaptureAction[];
}): Promise<{ capture: ReferenceWebCapture; indexPath: string; reused: boolean; ingest: Awaited<ReturnType<typeof ingestReferenceMedia>> | null }>
```

逻辑按这个顺序写：

1. 校验 `captureId` 正则，不合法抛 `invalid capture id`。
2. 计算 `fps = input.fps ?? 4`，`seconds = input.durationSeconds ?? 20`，`viewport = input.viewport ?? { width: 390, height: 844 }`，`frameCount = Math.floor(seconds * fps) + 1`。`frameCount` 不在 2..900 抛错。`fps` 必须 > 0 且 ≤ 30。
3. `captureRel = 'reference-capture/' + captureId`，`captureDir = path.join(runRoot, captureRel)`，`indexPath = path.join(captureDir, REFERENCE_WEB_CAPTURE_INDEX_NAME)`。
4. 如果 `indexPath` 已存在（用 `exists`）：
   - 解析它；`requestedUrl !== input.url` 抛 `capture id already used for a different url`。
   - 逐帧校验文件哈希，有不一致抛 `existing capture was modified; use a new capture id`。
   - `status === 'READY'` 时先逐帧核对哈希，再调用第 9 步的入库（入库函数按哈希去重，重复调用安全），返回 `reused: true`。`BLOCKED` 时删除这个采集目录并重新采集；同一个 ID 换网址则抛错。
5. `const browser = await chromium.launch();`，用 `try { ... } finally { await browser.close(); }` 包住后面所有浏览器操作。
6. `const context = await browser.newContext({ viewport, deviceScaleFactor: 1 }); const page = await context.newPage();`
   - `page.on('response', ...)`：数组长度 < 2000 时 push `{ url, resourceType: response.request().resourceType(), status, mimeType: headers['content-type'] ?? '', sizeBytes }`，`sizeBytes` 取 `content-length` 头，不是非负整数就填 `null`。不要调用 `response.body()`。
   - `page.on('console', ...)`：类型为 `error` 且数组长度 < 200 时 push `message.text().slice(0, 500)`。
   - `page.on('pageerror', ...)`：同上，push `error.message.slice(0, 500)`。
7. `page.goto(url, { waitUntil: 'load', timeout: 30_000 })` 包在 try/catch 里，失败时 `blockers.push('page-load-failed:' + 错误信息前 200 字)`，跳过第 8 步。
8. 截图循环（只在没有 blocker 时执行）：
   - `mkdir(path.join(captureDir, 'frames'), { recursive: true })`
   - 动作按 `atMs` 升序排序；`intervalMs = Math.round(1000 / fps)`；`start = Date.now()`
   - 对 `i = 0 .. frameCount - 1`：
     1. `requestedMs = i * intervalMs`；等到 `start + requestedMs`（用 `page.waitForTimeout`，只在剩余时间 > 0 时等）。
     2. 执行所有 `atMs <= requestedMs` 且未执行的动作：
        - `tap`：`page.mouse.click(x * viewport.width, y * viewport.height)`
        - `drag`：`mouse.move(起点)`、`mouse.down()`、`mouse.move(终点, { steps: Math.max(2, Math.round(durationMs / 16)) })`、`mouse.up()`
        - `key`：`page.keyboard.press(key)`
        - 每个动作包 try/catch，记录 `{ order, action, actualMs: Date.now() - start, performed, error }`
     3. `buffer = await page.screenshot({ type: 'png' })`；读 PNG 宽高，不等于视口则 `blockers.push('frame-size-mismatch:' + i)` 并跳出循环。
     4. 写到 `frames/frame-XXXXX.png`，push 帧记录（`actualMs = Date.now() - start`，`sha256` 为 buffer 的哈希）。
   - 循环结束后没执行的动作也要记进 `interactions`，`performed: false, error: 'not reached before capture ended'`。
9. 组装索引对象：`finalUrl = page.url()`，`pageTitle = await page.title()`（失败填空字符串），`browser: { name: 'chromium', version: browser.version() }`，`durationMs = Math.max(1, 最后一帧 actualMs)`（没有帧时填 1），`status = blockers.length === 0 && frames.length >= 2 ? 'READY' : 'BLOCKED'`；如果 BLOCKED 但 `blockers` 为空，push `'too-few-frames'`。用 `ReferenceWebCaptureSchema.parse` 校验后用 `writeJsonAtomic(indexPath, capture)` 写入。
10. 只有 READY 才入库：
    ```ts
    ingestReferenceMedia({ sourcePath: indexPath, runRoot, targetGame, workspace, id: `web-capture-${captureId}`, purpose: 'gameplay-reference', analysisText: false })
    ```
    BLOCKED 时 `ingest: null`。
11. 返回 `{ capture, indexPath, reused: false, ingest }`。

读 PNG 宽高的辅助函数照抄：

```ts
function pngSize(buffer: Buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) throw new Error('screenshot is not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
```

导入：`chromium` 从 `@playwright/test`；`exists`、`writeJsonAtomic` 从 `./files.js`；`ingestReferenceMedia` 从 `./evidence-provenance.js`；Schema 从 `../schemas/reference-web-capture.js`；哈希用 `node:crypto` 的 `createHash`。

跑 `pnpm vitest run tests/e2e/reference-web-capture.test.ts` 必须通过。如果报 Chromium 未安装，执行 `pnpm exec playwright install chromium` 后重跑（这不算新增依赖）。

## 步骤 7：工厂方法和命令行

### 7a. `src/factory.ts`：在 `extractReferenceFrames` 方法后面加

```ts
async captureReferenceUrl(runId: string, captureOptions: { url: string; captureId: string; durationSeconds?: number; fps?: number; actions?: ReferenceCaptureAction[] }) {
  const runRoot = store.runRoot(runId);
  if (!await exists(runRoot)) throw new Error(`Run ${runId} does not exist`);
  const provenanceFile = path.join(runRoot, 'reference-evidence/manifest.json');
  const provenance = await exists(provenanceFile) ? EvidenceProvenanceManifestSchema.parse(JSON.parse(await readFile(provenanceFile, 'utf8'))) : undefined;
  return captureReferenceUrl({
    runRoot,
    targetGame: provenance?.targetGame ?? runId,
    workspace: provenance?.workspace ?? path.join(runRoot, 'workspace', 'game'),
    ...captureOptions,
  });
},
```

顶部导入 `captureReferenceUrl` 从 `./core/reference-web-capture.js`。

### 7b. `src/cli/factory.ts`：在 `case 'extract-reference-frames'` 那一行后面加

```ts
case 'capture-reference-url': {
  const actionsFile = option('--actions');
  const actions = actionsFile ? ReferenceCaptureActionListSchema.parse(JSON.parse(await (await import('node:fs/promises')).readFile(path.resolve(actionsFile), 'utf8'))) : undefined;
  console.log(JSON.stringify(await factory.captureReferenceUrl(requireArg(args[0], 'run-id'), {
    url: requireArg(option('--url'), 'url'),
    captureId: requireArg(option('--capture-id'), 'capture-id'),
    ...(option('--seconds') ? { durationSeconds: Number(option('--seconds')) } : {}),
    ...(option('--fps') ? { fps: Number(option('--fps')) } : {}),
    ...(actions ? { actions } : {}),
  }), null, 2));
  break;
}
```

顶部导入 `ReferenceCaptureActionListSchema` 从 `../schemas/reference-web-capture.js`。在 `default:` 的 Usage 字符串里，`extract-reference-frames` 后面加上 `|capture-reference-url`。

## 步骤 8：README

在 README 中 `extract-reference-frames` 用法那段之后，加一小节“从网址采集参考游戏”，写清楚四条命令：

```bash
pnpm factory capture-reference-url "$run_id" --url "https://example.com/game" --capture-id first-look --seconds 20 --fps 4 --actions actions.json
pnpm evidence:review -- --run-root "runs/$run_id" --target-game "$run_id" --workspace "$PWD/runs/$run_id/workspace/game" --id web-capture-first-look --expected-sha256 <命令输出里的 ingest.sha256> --reviewer <你的名字> --basis "落地网址、页面标题、首屏截图与目标游戏一致"
pnpm factory extract-reference-frames "$run_id" --evidence-id web-capture-first-look
```

并说明：`actions.json` 是动作数组（给一个 tap 和一个 key 的示例）；复核前必须打开 `reference-capture/<id>/frames/frame-00000.png` 和索引里的 `finalUrl`、`pageTitle`，确认是目标游戏；采集不下载网页素材。

## 步骤 9：最终验证（全部通过才算完成）

按顺序执行，全部必须 0 退出：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

然后做一次手动冒烟：

1. `FACTORY_MODE=mock pnpm --silent factory new examples/seeds/relic-revival-workshop.yaml` 得到一个 run id。
2. 对这个 run 用本地 `file://` 测试页执行 `capture-reference-url`。
3. 用输出的 `ingest.sha256` 执行 `evidence:review`。
4. 执行 `extract-reference-frames`，确认 `artifacts/reference-frame-manifest.json` 的 `status` 是 `READY`，`source.mediaType` 是 `image/png-sequence`。
5. 冒烟结束后，删除这次冒烟创建的 `runs/<run-id>` 目录（只删你自己刚创建的这一个）。

## 步骤 10：完成报告（照这个格式交）

```
改动文件：（逐个列出）
新增测试：（逐个列出，写每个文件多少个用例）
pnpm lint：通过/失败
pnpm typecheck：通过/失败
pnpm test：通过 X 个 / 失败 Y 个
冒烟结果：reference-frame-manifest.json 的 status、mediaType、frames 数量
没做的事：自动探测、发布包配置读取、联系表
遇到但没解决的问题：（没有就写“无”）
```

## 常见错误（出现就说明做错了）

- 改了 `package.json` 或 `pnpm-lock.yaml`。
- `runs/` 目录里留下了东西。
- 索引文件名不是 `reference-web-capture.json`，导致入库后识别不到。
- 调用了 `response.body()` 或把网页资源写进磁盘。
- 采集后 manifest 里 `usableAsEvidence` 是 `true`。
- 为了让测试通过而修改或删除已有测试。
- 截图设备像素比不是 1，导致帧宽高是 780×1688。
