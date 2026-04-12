# TASK-42 — God Object Refactor (Tool Decoupling)

**Status**: TODO  
**Priority**: Medium  

## Problem
The `src/index.ts` (or the main entry point) has grown into a "God Object" containing 30+ tool definitions and handlers. This makes it hard to maintain and prone to merge conflicts.

## Scope
- [ ] Break `index.ts` down into individual tool handlers in `src/tools/`.
- [ ] Implement a `ToolRegistry` to auto-load handlers.
- [ ] Standardize the "Context Enrichment" pattern for all tools.

## AppForge Reference
- `TASK-42-god-object-refactor-src-tools.md`.
