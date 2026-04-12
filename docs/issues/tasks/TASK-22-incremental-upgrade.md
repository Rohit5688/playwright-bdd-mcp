# TASK-22 — Incremental Upgrade Support

**Status**: TODO  
**Priority**: Medium  

## Problem
Currently, `upgrade_project` simply restores missing baseline files. It needs to incrementally apply new features (like reporters or credential files) and sync the user's config with the latest schema without overwriting their custom edits.

## Scope
- [ ] Implement `syncConfigSchema` in `ProjectSetupService`.
- [ ] Add `featureCheck` logic to `upgrade_project` to detect missing but available project modules.
- [ ] Implement `McpConfigService.mergePartial` for safe synchronization.

## AppForge Reference
- `TASK-22-upgrade-incremental.md`.
