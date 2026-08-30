---
name: codex-game-repair
description: Continue the Builder Codex thread to repair only explicit QA issues, capped at two automatic attempts. Use for the factory FIX stage.
---

# Codex Game Repair

## Trigger

Use only when a validated QA report has error issues and `fixAttempts < 2`. This is allowed to modify
`workspace/game`. Do not refactor unrelated code, change approved style, or invent improvements not in QA.

## Inputs and outputs

- Inputs: `artifacts/qa-report.json`, Builder `codexThreadId`, generated game workspace.
- Outputs: modified workspace, rebuilt `dist/`, structured fix evidence; next stage is QA again.

## Procedure

1. Extract issue ids, messages, and evidence. Form a narrow repair prompt that quotes no unrelated requirements.
2. Resume the stored thread id; if unavailable, start a workspace-scoped thread and record the replacement id.
3. Modify only files causally connected to listed issues. Build Web and increment the attempt exactly once.
4. Return to QA; never mark the issue fixed based on the model response.

## Acceptance

Attempt count is 1 or 2, build exits zero, thread continuity is recorded, and Playwright re-verifies behavior.

## Failure

At two failed fixes stop with a failed run and preserve the final QA report. Codex/build errors count as their current
attempt and are logged; never recurse indefinitely or replace the whole template.
