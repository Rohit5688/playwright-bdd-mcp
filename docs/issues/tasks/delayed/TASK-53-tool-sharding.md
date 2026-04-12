# TASK-53 — Role-Based Tool Sharding

**Status**: TODO  
**Priority**: Medium  

## Problem
With over 30 tools, the LLM suffers from "Choice Paralysis," often picking the wrong tool or defaulting to generic ones (`grep`) instead of specialized ones.

## Scope
- [ ] Categorize tools into "Roles" (Discovery, Authoring, Execution, Healing).
- [ ] Dynamically filter the tool definitions sent to the LLM based on the current detected intent.
- [ ] Update tool metadata to include `suggestedNextTools[]`.

## AppForge Reference
- `docs/issue/pipeline/mcp_llm_bottlenecks.md` (Bottleneck 2).
