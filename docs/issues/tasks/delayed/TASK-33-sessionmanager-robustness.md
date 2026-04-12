# TASK-33 — SessionManager Robustness

**Status**: TODO  
**Priority**: Medium  

## Problem
The `SessionManager` lacks robust cleanup for timed-out or crashed Playwright sessions, which can lead to "Port in Use" errors during parallel test development.

## Scope
- [ ] Implement `zombieSessionCleanup` routine.
- [ ] Add `sessionLease` timeouts to the memory pool.
- [ ] Implement `getActiveSessions` for better agentic observability.

## AppForge Reference
- `TASK-33-sessionmanager-robustness.md`.
