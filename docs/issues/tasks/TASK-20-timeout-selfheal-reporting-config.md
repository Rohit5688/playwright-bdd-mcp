# TASK-20 — Config-Driven Timeouts & Intervals

**Status**: TODO  
**Priority**: Medium  

## Problem
Many services (Session, Runner, Healer) use hardcoded "magic numbers" for timeouts and polling intervals.

## Scope
- [ ] Refactor `TestRunnerService` to use `config.timeouts.testRun`.
- [ ] Refactor `PlaywrightSessionService` to use `config.timeouts.sessionStart`.
- [ ] Refactor `SelfHealingService` to use `config.timeouts.healingMax`.

## AppForge Reference
- `TASK-20-timeout-selfheal-reporting-config.md`.
