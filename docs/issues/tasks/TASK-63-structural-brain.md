# TASK-63 — Structural Brain Service (Dependency Mapping)

**Status**: TODO  
**Priority**: High (System Intelligence)

## Problem
Currently, TestForge agents are "structurally blind." When they modify a file, they don't know if it's a "God Node" (a file imported by many other files). Changing a God Node has a high risk of cascading failures.

## Scope
- [ ] Implement `StructuralBrainService.ts` in `src/services/`.
- [ ] Port the import-graph scanning logic from AppForge.
- [ ] Add persistence to `<projectRoot>/.TestForge/structural-brain.json`.
- [ ] Implement "God Node Detection" (threshold: >5 imports).
- [ ] Register `scan_structural_brain` tool in `index.ts`.
- [ ] Inject pre-flight warnings into the `validate_and_write` tool if a God Node is being modified.

## AppForge Reference
- `AppForge/src/services/StructuralBrainService.ts`
