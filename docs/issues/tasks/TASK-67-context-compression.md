# TASK-67 — Context Compression (Token Efficiency)

**Status**: TODO  
**Priority**: Medium (Optimization)

## Problem
In long debugging sessions involving multiple DOM inspections, the conversation context grows massive, slowing down the model and increasing costs.

## Scope
- [ ] Implement `ContextManager.ts` to track tool call history.
- [ ] Implement "Context Compression": After 3 UI scans, compress the oldest ones into single-line summaries while keeping the most recent 2 full-size.
- [ ] Inject the "Compacted Context" into the tool response headers for all generation tools.

## AppForge Reference
- `AppForge/src/services/ContextManager.ts`
