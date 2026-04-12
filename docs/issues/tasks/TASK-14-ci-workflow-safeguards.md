# TASK-14 — CI Workflow Safeguards

**Status**: TODO  
**Priority**: Low (Integrity)  

## Problem
The CI generator (`ProjectSetupService`) lacks strict boundary checks, potentially allowing it to write files outside the specified `projectRoot` if a malicious or malformed path is provided.

## Scope
- [ ] Implement `isPathInsideProject` guard for all CI-related writes.
- [ ] Standardize GitHub Actions template paths in `mcp-config.json`.
- [ ] Add `preview: true` support to the CI generation tool.

## AppForge Reference
- `TASK-14-ci-workflow-and-selfheal-fix.md`.
