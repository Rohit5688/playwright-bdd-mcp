# TASK-09 — Sandbox Security Hardening

**Status**: TODO  
**Priority**: High (Security)  
**Complexity**: Medium  

## Problem
The `SandboxEngine` currently has potential path traversal vulnerabilities in its `readFile` logic and lacks guards against Promise prototype pollution.

## Scope
- [ ] Implement `resolveSafePath` utility to prevent reading outside the project root.
- [ ] Add prototype freezing for core objects within the sandbox context.
- [ ] Implement resource limits (CPU/Memory) for sandboxed script execution.
- [ ] Refactor `SandboxEngine.ts` to use a more isolated `vm` context if possible.

## AppForge Reference
- `TASK-09-sandbox-security.md` (Reference Folder).
- Fixes the "Release Blockers" identified during the initial security audit.
