import { buildContextPacket, type ContextPacket } from '../core/context-budget.js';
import { sha256Text } from '../core/files.js';
import { AgentPackageSchema, buildAgentPackageInstruction, packageAuditView, packageForExecution, type AgentPackage } from './packages.js';
import { AgentTaskBundleSchema, buildTaskBundle, type AgentPackageSelection, type AgentTaskBundle } from './work-spec.js';

export type CompilerInput = { path: string; content: string; priority?: 'required' | 'important' | 'optional' };

export type AgentContextCompilerInput = AgentPackageSelection & {
  summary: string;
  inputs: CompilerInput[];
  requiredPaths?: string[];
  includeOptionalPaths?: string[];
  maxChars?: number;
  /** When true, missing line/runtime/task matches stop before a provider call. */
  requireWorkMatch?: boolean;
  /** The controller can pass the closed-world tool inventory it actually exposed. */
  availableTools?: string[];
  objective?: string;
  nonGoals?: string[];
  lockedDecisions?: string[];
  allowedDiscretion?: string[];
  requiresApproval?: string[];
};

export type CompiledAgentContext = {
  package: AgentPackage;
  packet: ContextPacket;
  taskBundle: AgentTaskBundle;
  instruction: string;
  audit: ReturnType<typeof packageAuditView>;
};

export class AgentContextCompilationError extends Error {
  readonly blockers: string[];
  constructor(blockers: string[]) {
    super(`agent context compilation rejected: ${blockers.join(', ')}`);
    this.name = 'AgentContextCompilationError';
    this.blockers = [...blockers];
  }
}

function normalizePath(value: string): string {
  const normalized = value.trim().replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) throw new AgentContextCompilationError([`unsafe-context-path:${value}`]);
  return normalized;
}

function requiredToolsForSelection(packageDefinition: AgentPackage): string[] {
  return packageDefinition.recipeRef.requiredTools.filter((tool) => !packageDefinition.availableTools.includes(tool));
}

/**
 * Compile one bounded role/phase/line/task work specification. The compiler
 * owns selection and provenance; providers receive only the resulting bundle,
 * never the repository handoff or an unbounded transcript.
 */
export function compileAgentContext(input: AgentContextCompilerInput): CompiledAgentContext {
  const packageDefinition = packageForExecution(input);
  const normalizedInputs = input.inputs.map((item) => ({ ...item, path: normalizePath(item.path) }));
  const required = new Set((input.requiredPaths ?? []).map(normalizePath));
  const optional = new Set((input.includeOptionalPaths ?? []).map(normalizePath));
  const available = new Set(normalizedInputs.map((item) => item.path));
  const missingRequired = [...required].filter((path) => !available.has(path));
  if (missingRequired.length > 0) throw new AgentContextCompilationError(missingRequired.map((path) => `required-input-missing:${path}`));
  const toolBlockers = requiredToolsForSelection(packageDefinition);
  if (toolBlockers.length > 0) throw new AgentContextCompilationError(toolBlockers.map((tool) => `required-tool-unavailable:${tool}`));
  if (input.requireWorkMatch === true) {
    if (!input.productionLine && (packageDefinition.role === 'builder' || packageDefinition.role === 'fixer' || packageDefinition.role === 'reviewer' || packageDefinition.role === 'evidence-helper')) throw new AgentContextCompilationError(['production-line-required-for-work-match']);
    if (!input.taskId && (packageDefinition.role === 'builder' || packageDefinition.role === 'fixer')) throw new AgentContextCompilationError(['task-id-required-for-mutating-work-match']);
  }
  const selected = normalizedInputs.filter((item) => required.has(item.path) || optional.has(item.path));
  const selectedPaths = new Set(selected.map((item) => item.path));
  const omitted = normalizedInputs.filter((item) => !selectedPaths.has(item.path));
  const packet = buildContextPacket({
    stage: packageDefinition.stage,
    summary: input.summary,
    inputs: [
      ...selected.map((item) => ({ path: item.path, content: item.content, priority: required.has(item.path) ? 'required' as const : item.priority ?? 'important' as const })),
      ...omitted.map((item) => ({ path: item.path, content: '', priority: 'optional' as const })),
    ],
    maxChars: Math.min(input.maxChars ?? packageDefinition.contextBudget, packageDefinition.contextBudget),
  });
  const inputHashes = Object.fromEntries(packet.inputs.map((item) => [item.path, sha256Text(item.excerpt)]));
  let taskBundle = buildTaskBundle({
    package: packageDefinition,
    objective: input.objective ?? input.summary,
    nonGoals: input.nonGoals,
    lockedDecisions: input.lockedDecisions,
    allowedDiscretion: input.allowedDiscretion,
    requiresApproval: input.requiresApproval,
    taskId: input.taskId,
    targetRunId: input.targetRunId,
    targetGameId: input.targetGameId,
    targetWorkspaceRelative: input.targetWorkspaceRelative,
    inputPaths: packet.inputs.map((item) => item.path),
    inputHashes,
  });
  const instruction = buildAgentPackageInstruction({ stage: packageDefinition.stage, base: input.summary, package: packageDefinition, taskBundle });
  taskBundle = AgentTaskBundleSchema.parse({ ...taskBundle, promptProvenance: { ...taskBundle.promptProvenance, promptBundleHash: sha256Text(instruction) } });
  const audit = packageAuditView(packageDefinition, taskBundle, instruction);
  AgentPackageSchema.parse(packageDefinition);
  return { package: packageDefinition, packet, taskBundle, instruction, audit };
}
