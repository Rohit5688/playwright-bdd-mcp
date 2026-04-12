# TASK-55 — Super-Tool Consolidation

**Status**: TODO  
**Priority**: High (Token Efficiency)  

## Problem
AppForge/TestForge has too many "Nano-tools" (one-off tools like `set_credentials`) that waste tokens on redundant schemas.

## Scope
- [ ] Consolidate related tools into "Super-tools."
- [ ] Merge `set_credentials`, `inject_app_build` into `manage_config({operation: 'write'})`.
- [ ] Merge `end_session` into `start_session({operation: 'stop'})`.

## AppForge Reference
- `docs/issue/pipeline/INDEPENDENT_TOOL_ANALYSIS.md`.
