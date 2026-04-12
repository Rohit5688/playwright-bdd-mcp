# TASK-52 — Context Pulse (Session Refresh)

**Status**: TODO  
**Priority**: Medium  

## Problem
In long sessions, the LLM's context becomes stale. It may "forget" the current state of the file system or an active browser session, leading to redundant or invalid tool calls.

## Scope
- [ ] Implement a `ContextPulseService` that tracks session and file state.
- [ ] Automatically append a "Pulse" block to short-lived tool responses (like `list_dir`) every 5 turns.
- [ ] Provide a `get_system_state` tool for explicit refresh.

## AppForge Reference
- `docs/issue/pipeline/mcp_llm_bottlenecks.md` (Bottleneck 1).
