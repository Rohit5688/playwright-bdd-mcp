# TASK-12 — Pure Config Read Operations

**Status**: TODO  
**Priority**: Medium (Resilience)  

## Problem
Currently, reading the configuration may trigger side-effects where default values are permanently written to disk, polluting the user's config file.

## Scope
- [ ] Refactor `McpConfigService.read()` to separate the "Read" from the "Enforce Defaults" logic.
- [ ] Ensure `mtime` on the config file is only updated during explicit `write` operations.
- [ ] Implement a `preview` mode for `manage_config`.

## AppForge Reference
- `TASK-12-config-read-sideeffects.md` (Reference).
