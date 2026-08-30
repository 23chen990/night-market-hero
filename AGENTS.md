# Repository Instructions

- This repository is an AI mini-game factory, not a single game project.
- Inspect the existing architecture before modifying it; reuse adapters, schemas, templates, and skills.
- Agents exchange only Zod-validated structured artifacts. They do not free-chat.
- Only BuilderAgent and FixerAgent may modify a generated game workspace.
- Never hardcode API keys. Read secrets only from environment variables.
- Never copy third-party game code, assets, names, UI, or balancing values. Generic mechanics are allowed,
  but expression and content must be original.
- Every feature and behavior change requires tests. Use test-first development.
- After changes, run lint, typecheck, and tests. Before claiming completion, provide machine-verifiable evidence.
- Avoid unnecessary production dependencies, microservices, complex backends, databases, queues, and Docker.
- Every run must pause and resume. Repeating a completed stage should be idempotent whenever practical.
- Preserve user changes and do not commit automatically.
