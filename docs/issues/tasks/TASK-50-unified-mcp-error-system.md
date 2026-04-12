# TASK-50 — Unified McpError System (JSON-RPC Taxonomy)

**Status**: TODO  
**Priority**: Medium (Resilience)  
**Complexity**: Medium  

## Problem
Currently, TestForge uses generic `Error` objects or a legacy `TestForgeError` class that lacks structured codes and retryability flags. This makes it impossible for the agent to distinguish between terminal errors (syntax errors) and transient ones (Appium timeout).

## Scope
- [ ] Create `src/types/ErrorSystem.ts`.
- [ ] Define `McpErrorCode` registry (Session, File, Security, Runtime).
- [ ] Define `McpError` class extending `Error`.
- [ ] Add `retryable` boolean and `toMcpResponse()` serialization.
- [ ] Port `McpErrors` factory for consistent error creation.
- [ ] Update all service boundaries to throw structured `McpErrors`.

## AppForge Benchmark
- `src/types/ErrorSystem.ts` (TASK-GS-05).
- Provides a "Safety Net" for the entire MCP server, preventing unhandled promise rejections from crashing the process.
