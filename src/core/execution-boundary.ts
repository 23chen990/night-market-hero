import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ContextPacketSchema, verifyContextPacketIntegrity } from './context-budget.js';
import { executionPolicyForStage, type ExecutionPolicy } from './model-policy.js';
import { StageNameSchema } from '../schemas/index.js';
import type { AgentExecutionContext } from '../providers/interfaces.js';
import { AgentPackageSchema, validatePackageToolDeclarations } from '../agents/packages.js';
import { AgentTaskBundleSchema, AgentTaskKindSchema, acceptanceContentHash, probeAvailableToolIds, recipeContentHash, skillContentHash, toolPolicyContentHash, validateWorkSpecProvenance } from '../agents/work-spec.js';
import { ProductionLineSchema } from './production-lines.js';
import { sha256Text } from './files.js';

/** A hard failure at the model/tool boundary. It is intentionally not recoverable by a model. */
export class ExecutionBoundaryError extends Error {
  constructor(message: string) {
    super(`execution boundary rejected request: ${message}`);
    this.name = 'ExecutionBoundaryError';
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertAbsolute(value: unknown, name: string): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.trim() === path.parse(value).root) {
    throw new ExecutionBoundaryError(`${name} must be an absolute non-root path`);
  }
  return path.resolve(value);
}

function assertRelativeArtifact(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || path.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new ExecutionBoundaryError(`${name} must be a relative path`);
  }
  const normalized = value.replaceAll('\\', '/');
  if (normalized.split('/').some((part) => part === '..') || normalized === '.' || normalized.startsWith('../')) {
    throw new ExecutionBoundaryError(`${name} contains a path traversal`);
  }
  return normalized;
}

/** Hash a directory using the same byte-level tree identity as contextFor.
 * This is synchronous because the execution boundary is deliberately called
 * immediately before a provider dispatch. */
function sha256DirectorySync(directory: string): string {
  const entries: string[] = [];
  const walk = (current: string, relative = ''): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const info = lstatSync(child);
      if (info.isSymbolicLink()) throw new ExecutionBoundaryError(`task bundle input source contains a symlink: ${childRelative}`);
      if (info.isDirectory()) walk(child, childRelative);
      else if (info.isFile()) entries.push(`${childRelative}:${createHash('sha256').update(readFileSync(child)).digest('hex')}`);
      else throw new ExecutionBoundaryError(`task bundle input source contains a non-regular entry: ${childRelative}`);
    }
  };
  walk(directory);
  return sha256Text(entries.sort().join('\n'));
}

/** Public lexical guard for callers that need to validate a pointer before
 * opening it. It intentionally performs no filesystem access. */
export function assertSafeContextInputPath(value: unknown): string {
  return assertRelativeArtifact(value, 'context input path');
}

function policyForStage(stageValue: unknown): ExecutionPolicy {
  const stage = StageNameSchema.safeParse(stageValue);
  if (!stage.success) throw new ExecutionBoundaryError(`unknown stage ${String(stageValue)}`);
  return executionPolicyForStage(stage.data);
}

/**
 * Validate the narrow execution contract handed to a provider. This is a
 * lexical check by design; filesystem symlink checks belong to the run store
 * immediately before a write. No network or secret capability can be enabled
 * through this object.
 */
export function assertExecutionContext(value: AgentExecutionContext, options: { strictPaths?: boolean } = {}): AgentExecutionContext & { role: ExecutionPolicy['role']; policy: ExecutionPolicy } {
  if (!value || typeof value !== 'object') throw new ExecutionBoundaryError('context must be an object');
  const context = value as AgentExecutionContext & Record<string, unknown>;
  const runRoot = assertAbsolute(context.runRoot, 'runRoot');
  const outputPath = assertAbsolute(context.outputPath, 'outputPath');
  const logDir = assertAbsolute(context.logDir, 'logDir');
  if (options.strictPaths !== false) {
    if (!isWithin(runRoot, outputPath)) throw new ExecutionBoundaryError('outputPath must remain inside run root');
    if (!isWithin(runRoot, logDir)) throw new ExecutionBoundaryError('logDir must remain inside run root');
  }
  if (!Array.isArray(context.inputPaths)) throw new ExecutionBoundaryError('inputPaths must be an array');
  context.inputPaths.forEach((item, index) => assertRelativeArtifact(item, `inputPaths[${index}]`));
  if (context.mediaInputs !== undefined) {
    if (!Array.isArray(context.mediaInputs)) throw new ExecutionBoundaryError('mediaInputs must be an array');
    if (policyForStage(context.stage).role !== 'research') throw new ExecutionBoundaryError('mediaInputs are restricted to research stages');
    for (const [index, media] of context.mediaInputs.entries()) {
      if (!media || typeof media !== 'object') throw new ExecutionBoundaryError(`mediaInputs[${index}] must be an object`);
      const mediaPath = assertRelativeArtifact(media.path, `mediaInputs[${index}].path`);
      if (!mediaPath.startsWith('reference-evidence/derived/') || !/\.(?:png|jpe?g|webp)$/iu.test(mediaPath)) throw new ExecutionBoundaryError('mediaInputs must be images inside derived reference evidence');
      if (typeof media.sha256 !== 'string' || !/^[a-f0-9]{64}$/iu.test(media.sha256)) throw new ExecutionBoundaryError(`mediaInputs[${index}] requires a SHA-256 hash`);
    }
  }
  if (context.targetGameId !== undefined && (typeof context.targetGameId !== 'string' || context.targetGameId.trim().length === 0)) {
    throw new ExecutionBoundaryError('targetGameId cannot be empty');
  }
  if (context.inputSourceRoot !== undefined) assertAbsolute(context.inputSourceRoot, 'inputSourceRoot');
  if (context.productionLine !== undefined && context.productionLine !== null && !ProductionLineSchema.safeParse(context.productionLine).success) throw new ExecutionBoundaryError(`invalid production line ${String(context.productionLine)}`);
  if (context.taskKind !== undefined && !AgentTaskKindSchema.safeParse(context.taskKind).success) throw new ExecutionBoundaryError(`invalid task kind ${String(context.taskKind)}`);
  if (context.taskId !== undefined && (typeof context.taskId !== 'string' || context.taskId.trim().length === 0)) throw new ExecutionBoundaryError('taskId cannot be empty');
  if (context.targetWorkspaceRelative !== undefined) assertRelativeArtifact(context.targetWorkspaceRelative, 'targetWorkspaceRelative');
  if (context.requiredArtifacts !== undefined) {
    if (!Array.isArray(context.requiredArtifacts) || context.requiredArtifacts.length === 0) throw new ExecutionBoundaryError('requiredArtifacts must be a non-empty array');
    context.requiredArtifacts.forEach((item, index) => assertRelativeArtifact(item, `requiredArtifacts[${index}]`));
  }
  const policy = policyForStage(context.stage);
  if (context.sandbox !== policy.sandbox) throw new ExecutionBoundaryError(`${policy.role} stage ${context.stage} requires ${policy.sandbox}`);
  if (context.workSpecRequired === true && (!context.agentPackage || !context.taskBundle)) {
    throw new ExecutionBoundaryError('work specification requires both agent package and task bundle');
  }
  const agentPackage = context.agentPackage === undefined ? undefined : AgentPackageSchema.parse(context.agentPackage);
  if (agentPackage) {
    if (agentPackage.stage !== context.stage) throw new ExecutionBoundaryError(`agent package stage does not match execution stage: ${agentPackage.stage} !== ${context.stage}`);
    if (agentPackage.role !== policy.role) throw new ExecutionBoundaryError(`agent package role does not match execution policy: ${agentPackage.role} !== ${policy.role}`);
    if (context.productionLine !== undefined && agentPackage.productionLine !== context.productionLine) throw new ExecutionBoundaryError('agent package production line does not match execution context');
    if (context.taskKind !== undefined && agentPackage.taskKind !== context.taskKind) throw new ExecutionBoundaryError('agent package task kind does not match execution context');
    if (context.runtime !== undefined && agentPackage.runtime !== context.runtime) throw new ExecutionBoundaryError(`agent package runtime does not match execution runtime: ${agentPackage.runtime} !== ${context.runtime}`);
    if (agentPackage.sandbox !== policy.sandbox || agentPackage.canModifyWorkspace !== policy.canModifyWorkspace) throw new ExecutionBoundaryError('agent package permission boundary does not match execution policy');
    agentPackage.protectedPaths.forEach((item, index) => assertRelativeArtifact(item, `agentPackage.protectedPaths[${index}]`));
    const toolCheck = validatePackageToolDeclarations(agentPackage);
    if (!toolCheck.passed) throw new ExecutionBoundaryError(`agent package tool policy rejected: ${toolCheck.blockers.join(', ')}`);
    const provenance = validateWorkSpecProvenance(agentPackage);
    if (!provenance.passed) throw new ExecutionBoundaryError(`agent package provenance rejected: ${provenance.blockers.join(', ')}`);
    if (context.workSpecRequired === true) {
      const actualTools = new Set(probeAvailableToolIds());
      const missing = agentPackage.allowedTools.filter((tool) => !actualTools.has(tool));
      const stale = agentPackage.availableTools.filter((tool) => !actualTools.has(tool));
      if (missing.length > 0) throw new ExecutionBoundaryError(`agent package requires tools unavailable in the current checkout: ${missing.join(', ')}`);
      if (stale.length > 0) throw new ExecutionBoundaryError(`agent package declares stale tools unavailable in the current checkout: ${stale.join(', ')}`);
    }
  }
  const taskBundle = context.taskBundle === undefined ? undefined : AgentTaskBundleSchema.parse(context.taskBundle);
  if (taskBundle) {
    if (taskBundle.stage !== context.stage) throw new ExecutionBoundaryError('task bundle stage does not match execution stage');
    if (taskBundle.role !== policy.role) throw new ExecutionBoundaryError(`task bundle role does not match execution policy: ${taskBundle.role} !== ${policy.role}`);
    if (context.productionLine !== undefined && taskBundle.productionLine !== context.productionLine) throw new ExecutionBoundaryError('task bundle production line does not match execution context');
    if (context.taskKind !== undefined && taskBundle.taskKind !== context.taskKind) throw new ExecutionBoundaryError('task bundle task kind does not match execution context');
    if (context.taskId !== undefined && taskBundle.taskId !== context.taskId) throw new ExecutionBoundaryError('task bundle task id does not match execution context');
    if (context.runtime !== undefined && taskBundle.runtime !== context.runtime) throw new ExecutionBoundaryError('task bundle runtime does not match execution runtime');
    taskBundle.inputPaths.forEach((item, index) => assertRelativeArtifact(item, `taskBundle.inputPaths[${index}]`));
    taskBundle.protectedPaths.forEach((item, index) => assertRelativeArtifact(item, `taskBundle.protectedPaths[${index}]`));
    if (taskBundle.targetWorkspaceRelative !== undefined) assertRelativeArtifact(taskBundle.targetWorkspaceRelative, 'taskBundle.targetWorkspaceRelative');
    if (agentPackage && (taskBundle.role !== agentPackage.role || taskBundle.productionLine !== agentPackage.productionLine || taskBundle.runtime !== agentPackage.runtime || taskBundle.taskKind !== agentPackage.taskKind || taskBundle.risk !== agentPackage.risk || taskBundle.recipeRef.sha256 !== agentPackage.recipeRef.sha256 || taskBundle.toolPolicyRef.sha256 !== agentPackage.toolPolicyRef.sha256 || taskBundle.acceptanceRef.sha256 !== agentPackage.acceptanceRef.sha256 || taskBundle.policyRef.sha256 !== sha256Text(agentPackage.commonRules) || taskBundle.roleProfileRef.sha256 !== sha256Text(agentPackage.roleRules) || JSON.stringify(taskBundle.protectedPaths) !== JSON.stringify(agentPackage.protectedPaths))) {
      throw new ExecutionBoundaryError('task bundle references do not match the agent package');
    }
    const executionInputs = new Set(context.inputPaths.map((item) => item.replaceAll('\\', '/')));
    if (taskBundle.inputPaths.some((item) => !executionInputs.has(item))) throw new ExecutionBoundaryError('task bundle input is not present in execution context');
    if (taskBundle.targetGameId && context.targetGameId && taskBundle.targetGameId !== context.targetGameId) throw new ExecutionBoundaryError('task bundle target game does not match execution context');
    if (taskBundle.targetWorkspaceRelative && context.targetWorkspaceRelative && taskBundle.targetWorkspaceRelative !== context.targetWorkspaceRelative) throw new ExecutionBoundaryError('task bundle workspace does not match execution context');
    const expectedRecipeHash = recipeContentHash(taskBundle.recipeRef);
    if (taskBundle.recipeRef.sha256 !== expectedRecipeHash || taskBundle.promptProvenance.recipeHash !== expectedRecipeHash) throw new ExecutionBoundaryError('task bundle recipe provenance hash mismatch');
    const expectedToolPolicyHash = toolPolicyContentHash(taskBundle.toolPolicyRef, taskBundle.role);
    if (taskBundle.toolPolicyRef.sha256 !== expectedToolPolicyHash || taskBundle.promptProvenance.toolPolicyHash !== expectedToolPolicyHash) throw new ExecutionBoundaryError('task bundle tool policy provenance hash mismatch');
    const expectedAcceptanceHash = acceptanceContentHash(taskBundle.acceptanceRef);
    if (taskBundle.acceptanceRef.sha256 !== expectedAcceptanceHash || taskBundle.promptProvenance.acceptanceHash !== expectedAcceptanceHash) throw new ExecutionBoundaryError('task bundle acceptance provenance hash mismatch');
    for (const skill of agentPackage?.skillRefs ?? []) {
      const expectedSkillHash = skillContentHash(skill);
      if (skill.sha256 !== expectedSkillHash) throw new ExecutionBoundaryError(`agent skill provenance hash mismatch: ${skill.id}`);
    }
    const inputHashes = taskBundle.promptProvenance.inputSourceHashes;
    const inputPaths = taskBundle.inputPaths;
    if (Object.keys(inputHashes).length !== inputPaths.length || inputPaths.some((item) => inputHashes[item] === undefined)) {
      throw new ExecutionBoundaryError('task bundle input source hash manifest does not match declared inputs');
    }
    if (context.workSpecRequired === true && context.inputSourceRoot !== undefined) {
      for (const inputPath of inputPaths) {
        const candidates = [path.join(context.runRoot, inputPath), path.join(context.inputSourceRoot, inputPath)];
        let foundCandidate = false;
        let availableCandidate = false;
        for (const candidate of candidates) {
          try {
            const stat = lstatSync(candidate);
            if (stat.isSymbolicLink()) continue;
            if (!stat.isFile() && !stat.isDirectory()) continue;
            availableCandidate = true;
            const actual = stat.isFile()
              ? createHash('sha256').update(readFileSync(candidate)).digest('hex')
              : sha256DirectorySync(candidate);
            if (actual === inputHashes[inputPath]) {
              foundCandidate = true;
              break;
            }
          } catch {
            // Try the next explicitly allowed source root.  The final error
            // below distinguishes an absent input from a changed one.
          }
        }
        if (!foundCandidate) {
          if (!availableCandidate) throw new ExecutionBoundaryError(`task bundle input source is unavailable: ${inputPath}`);
          throw new ExecutionBoundaryError(`task bundle input source hash mismatch: ${inputPath}`);
        }
      }
    }
    const expectedInputManifestHash = sha256Text(JSON.stringify({ paths: inputPaths, hashes: inputHashes }));
    if (taskBundle.inputManifestRef.sha256 !== expectedInputManifestHash || taskBundle.promptProvenance.inputManifestHash !== expectedInputManifestHash) {
      throw new ExecutionBoundaryError('task bundle input manifest provenance hash mismatch');
    }
  }
  if (context.model !== undefined && (typeof context.model !== 'string' || context.model.trim().length === 0)) throw new ExecutionBoundaryError('model override cannot be empty');
  if (context.reasoning !== undefined && !['low', 'medium', 'high', 'max'].includes(context.reasoning)) throw new ExecutionBoundaryError('unsupported reasoning level');
  if (context.contextPacket !== undefined) {
    const packet = ContextPacketSchema.parse(context.contextPacket);
    if (packet.stage !== context.stage) throw new ExecutionBoundaryError('context packet stage does not match execution stage');
    if (packet.totalChars > policy.handoffMaxChars) throw new ExecutionBoundaryError('context packet exceeds the stage handoff budget');
    if (context.enforceBoundary === true && !verifyContextPacketIntegrity(packet).passed) throw new ExecutionBoundaryError('context packet integrity check failed');
  }
  for (const forbidden of ['network', 'networkAccessEnabled', 'allowNetwork', 'allowSecrets', 'readSecrets', 'secretPath', 'apiKey']) {
    if (context[forbidden] === true || (typeof context[forbidden] === 'string' && context[forbidden])) throw new ExecutionBoundaryError(`${forbidden} cannot be enabled in an agent context`);
  }
  const role = policy.role;
  if ((role === 'builder' || role === 'fixer') && !isWithin(runRoot, path.join(runRoot, 'workspace'))) {
    throw new ExecutionBoundaryError('workspace scope could not be established');
  }
  // A provider context may point at a file inside the run, but only Builder
  // and Fixer are ever allowed to address the generated game workspace. This
  // lexical guard closes the easy accidental-escalation path; the run store
  // performs the final symlink-aware check before writes.
  if (role !== 'builder' && role !== 'fixer' && isWithin(path.join(runRoot, 'workspace'), outputPath)) {
    throw new ExecutionBoundaryError(`${role} outputPath cannot target the generated workspace`);
  }
  if (role === 'release' && !isWithin(path.join(runRoot, 'artifacts'), outputPath) && !isWithin(path.join(runRoot, 'release-candidate'), outputPath) && !isWithin(path.join(runRoot, 'logs'), outputPath)) {
    throw new ExecutionBoundaryError('release outputPath must remain in artifacts, release-candidate or logs');
  }
  return { ...context, runRoot, outputPath, logDir, role, policy };
}

/** Return a provider-safe subset without unknown capability flags. */
export type SafeExecutionContext = AgentExecutionContext & { role: ExecutionPolicy['role']; policy: ExecutionPolicy };

export function safeExecutionContext(value: AgentExecutionContext): SafeExecutionContext {
  const checked = assertExecutionContext(value, { strictPaths: value.enforceBoundary === true });
  return {
    runRoot: checked.runRoot,
    inputSourceRoot: checked.inputSourceRoot,
    outputPath: checked.outputPath,
    logDir: checked.logDir,
    inputPaths: checked.inputPaths.map((item) => item.replaceAll('\\', '/')),
    mediaInputs: checked.mediaInputs?.map((item) => ({ path: item.path.replaceAll('\\', '/'), sha256: item.sha256.toLowerCase() })),
    targetGameId: checked.targetGameId,
    targetWorkspaceRelative: checked.targetWorkspaceRelative,
    requiredArtifacts: checked.requiredArtifacts?.map((item) => item.replaceAll('\\', '/')),
    stage: checked.stage,
    productionLine: checked.productionLine,
    taskKind: checked.taskKind,
    taskId: checked.taskId,
    runtime: checked.runtime,
    model: checked.model,
    reasoning: checked.reasoning,
    sandbox: checked.sandbox,
    contextPacket: checked.contextPacket,
    agentPackage: checked.agentPackage,
    taskBundle: checked.taskBundle,
    enforceBoundary: checked.enforceBoundary,
    workSpecRequired: checked.workSpecRequired,
    role: checked.role,
    policy: checked.policy,
  };
}
