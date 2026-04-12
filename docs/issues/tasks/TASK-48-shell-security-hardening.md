# TASK-48 — Shell Security Hardening (execFile Migration)

**Status**: TODO  
**Priority**: High (Security/Reliability)  
**Complexity**: Medium  

## Problem
`TestRunnerService` currently uses `exec()` with string concatenation for running Playwright tests.
- This is vulnerable to shell injection if `specificTestArgs` is not perfectly sanitized.
- Complex arguments (like `--grep "User (Login)"`) fail due to shell quote interpretation.

## Scope
- [ ] Migrate `TestRunnerService` from `child_process.exec` to `child_process.execFile`.
- [ ] Parse `executionCommand` into executable + arguments array.
- [ ] Implement robust argument array building (pushing args instead of concatenating strings).
- [ ] Add `ShellSecurityEngine` utility to validate all arguments before execution.

## AppForge Benchmark
- `ExecutionService.ts` lines 345-405.
- Uses `execFileAsync(exe, args, ...)` to eliminate shell interpolation entirely.
