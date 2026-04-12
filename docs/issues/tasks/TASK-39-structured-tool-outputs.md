# TASK-39 — Structured Tool Outputs (Zod Validation)

**Status**: TODO  
**Priority**: High  

## Problem
Tools currently return raw JSON or strings without formal schema validation. This leads to runtime "cannot read property of undefined" errors when the LLM receives unexpected output formats.

## Scope
- [ ] Implement Zod schemas for all 30+ tool responses.
- [ ] Use `structuredContent` return type (MCP SDK).
- [ ] Add `outputSchema` to the `registerTool` definitions.

## AppForge Reference
- `TASK-39-structured-content-8-tools.md`.
