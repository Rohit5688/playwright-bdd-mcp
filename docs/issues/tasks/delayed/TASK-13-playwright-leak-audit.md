# TASK-13 — Playwright Context & Leak Audit

**Status**: TODO  
**Priority**: Medium (Stability)  

## Problem
In Playwright-BDD, long-running sessions can lead to browser context leaks or orphan processes if the session start/stop cycle isn't perfectly managed.

## Scope
- [ ] Audit `PlaywrightSessionService.ts` for leak patterns.
- [ ] Implement `forceCleanup` logic to kill orphaned browser instances.
- [ ] Add `browserArgs` configuration to `mcp-config.json` for headless/proxy control.

## AppForge Equivalence
- Replaces AppForge Task 13 (iOS Loop) with the Playwright equivalent foundation.
