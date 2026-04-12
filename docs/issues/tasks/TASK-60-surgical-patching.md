# TASK-60 — Surgical Patching Tool

**Status**: TODO  
**Priority**: Medium  

## Problem
Rewriting 1000-line "God Files" for simple changes is token-expensive and prone to code drift/comments deletion.

## Scope
- [ ] Implement a tool for "Laser-Surgical Edits" using anchor-based line replacement.
- [ ] The tool should find a target block (with 2 lines of context) and replace only that block.
- [ ] This avoids reading/writing the entire file buffer for large files.

## AppForge Reference
- `docs/issue/pipeline/mcp_llm_bottlenecks.md` (Friction Point 1).
