# TASK-15 — UserStore & Git Safety

**Status**: TODO  
**Priority**: High (Security)  

## Problem
`UserStoreService` handles test credentials, which must NEVER be committed to Git. A missing `.gitignore` guard is a high-risk security leak.

## Scope
- [ ] Implement automatic `.gitignore` injection during `manage_users(write)`.
- [ ] Ensure `users.{env}.json` paths are pre-validated against git ignoring rules.
- [ ] Port `set_credentials` hardening to ensure API keys are stored in a local `.env`.

## AppForge Reference
- `TASK-15-credential-service-fixes.md`.
