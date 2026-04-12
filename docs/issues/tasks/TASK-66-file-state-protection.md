# TASK-66 — File State Protection (Race Condition Prevention)

**Status**: TODO  
**Priority**: High (Safety)

## Problem
If an agent takes 30 seconds to generate a fix, and a user manually fixes the file in those 30 seconds, the agent will currently overwrite the user's manual fix with its (now stale) version.

## Scope
- [ ] Implement `FileStateService.ts` to record file hashes and modification times during `view_file` or `read_resource`.
- [ ] Update `validate_and_write` to check the current disk hash against the "last read hash."
- [ ] If hashes differ (external modification detected), block the write and warn the user.
- [ ] Force the agent to re-read the file before attempting another write.

## AppForge Reference
- `AppForge/src/services/FileStateService.ts`
