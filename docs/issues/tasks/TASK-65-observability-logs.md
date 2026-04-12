# TASK-65 — Observability Service (Unified Tool Logging)

**Status**: TODO  
**Priority**: High (Observability)

## Problem
Debugging failures in multi-step agentic flows is difficult without a structured, persistent trace of exactly what tools were called and what they returned.

## Scope
- [ ] Implement `ObservabilityService.ts` to log every tool execution.
- [ ] Format: JSONL (JSON Lines) for easy machine parsing.
- [ ] Storage: `<projectRoot>/mcp-logs/session-{timestamp}.jsonl`.
- [ ] Security: Implement a "Secret Masker" to redact environment variables, passwords, and tokens before logging.
- [ ] Integration: Wrap tool execution in `index.ts` with the logger.

## AppForge Reference
- `AppForge/src/services/ObservabilityService.ts`
