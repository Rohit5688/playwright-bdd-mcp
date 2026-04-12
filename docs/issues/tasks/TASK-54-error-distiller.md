# TASK-54 — Error Distiller (Log Sanitization)

**Status**: TODO  
**Priority**: Medium  

## Problem
Raw Playwright/Appium logs are extremely verbose, filling up the context window with metadata that isn't useful for debugging.

## Scope
- [ ] Implement an `ErrorDistiller` utility.
- [ ] Strip out timestamps, non-critical driver logs, and redundant stack traces.
- [ ] Return only the "Causal Chain" (Step -> Selector -> Root Failure).

## AppForge Reference
- `docs/issue/pipeline/mcp_llm_bottlenecks.md` (Bottleneck 3).
