# TASK-35 — Response Character Limit & Truncation

**Status**: TODO  
**Priority**: Medium  

## Problem
Huge outputs from tools like `inspect_ui_hierarchy` or `analyze_codebase` can flood the LLM context, leading to request timeouts or "lost tokens" where the AI ignores instructions at the end of the prompt.

## Scope
- [ ] Implement a global `CHARACTER_LIMIT` (e.g., 25,000 characters) for tool responses.
- [ ] Add smart truncation with a message: "Output truncated for brevity. Use pagination or specific queries for more detail."
- [ ] Apply specifically to: `inspect_ui_hierarchy`, `analyze_codebase`, `run_cucumber_test`.

## AppForge Reference
- `TASK-35-character-limit-truncation.md`.
