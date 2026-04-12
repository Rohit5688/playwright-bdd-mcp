# TASK-19 — Codegen Preferences Propagation

**Status**: TODO  
**Priority**: Medium  

## Problem
Generated tests currently follow a generic style. We need to wire user preferences (tags, naming conventions, BasePage strategy) into the AI generation prompt.

## Scope
- [ ] Update `TestGenerationService.ts` to read the `codegen` section from config.
- [ ] Inject these preferences into the `PromptFactory` templates.
- [ ] Add support for "Custom Post-Generation Scripts" hooks.

## AppForge Reference
- `TASK-19-codegen-config-propagation.md`.
