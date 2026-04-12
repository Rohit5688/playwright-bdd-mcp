# TASK-41 — Self-Learning Automation Loop

**Status**: TODO  
**Priority**: High  

## Problem
Currently, the "Learning Loop" (training the agent on new selectors) is a manual tool call. Ideally, the system should prompt or auto-trigger a knowledge deposit after a successful `verify_selector` or self-healing event.

## Scope
- [ ] Update `verify_selector` to include an optional `autoTrain: true` flag.
- [ ] Port the `train_on_example` logic into the `SelfHealingService` successful resolution path.
- [ ] Ensure `mcp-learning.json` is updated atomically.

## AppForge Reference
- `TASK-41-glob-fix-zod-autolearning.md`.
