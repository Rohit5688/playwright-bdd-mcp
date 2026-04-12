# TASK-51 — Non-Blocking Execution (Job Queue)

**Status**: TODO  
**Priority**: High (UX & Stability)  

## Problem
Currently, `run_tests` blocks the MCP RPC connection. Since Playwright/Appium runs can take minutes, they frequently trigger the 60s client-side timeout, causing the LLM to lose the results.

## Scope
- [ ] Implement an in-memory `JobQueue` in `ExecutionService`.
- [ ] Refactor `run_tests` to return a `jobId` and execute in the background.
- [ ] Implement `check_test_status(jobId)` tool with server-side sleep (max 55s) to enable stable polling.

## AppForge Reference
- `docs/issue/todo/new/ACTIVE_ISSUES.md` (Issue 1).
