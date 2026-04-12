# TASK-17 — Dynamic Environment Support

**Status**: TODO  
**Priority**: High (Flexibility)  

## Problem
Currently, environment-specific logic is likely hardcoded to "staging" or "prod". AppForge moved to a dynamic system where the environment names are read directly from `mcp-config.json`.

## Scope
- [ ] Implement `environments` array in `mcp-config.json`.
- [ ] Add `currentEnvironment` field to track active target.
- [ ] Update `ProjectSetupService` and `CredentialService` to resolve files based on the dynamic environment list.

## AppForge Reference
- `TASK-17-dynamic-environments.md`.
