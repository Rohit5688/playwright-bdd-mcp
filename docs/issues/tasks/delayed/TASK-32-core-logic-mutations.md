# TASK-32 — Core Logic and Config Mutations

**Status**: TODO  
**Priority**: Medium  

## Problem
`McpConfigService` currently allows "blind" mutations where nested properties can be overwritten or deleted during a `set` operation. 

## Scope
- [ ] Refactor `McpConfigService.set` to use a path-based deep update.
- [ ] Implement `validateConfigMutation` to prevent setting invalid types into known keys.
- [ ] Add `config_backup` facility to allow rollback of bad manual edits.

## AppForge Reference
- `TASK-32-core-logic-and-config-mutations.md`.
