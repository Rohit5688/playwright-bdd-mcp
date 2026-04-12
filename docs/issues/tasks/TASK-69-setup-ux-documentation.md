# TASK-69: Setup UX & Documentation Scaffolding

**Tier:** 1 (Developer Experience)  
**Reference:** AppForge `ProjectSetupService.ts`
**Target Files:** `src/services/ProjectSetupService.ts`, `src/templates/`

## 1. Description
Elevate the TestForge onboarding experience by porting the "Self-Documenting" patterns from AppForge. When a user runs `setup_project`, it should create not just code, but also helpful guides.

## 2. Execution Steps
- **Update Scaffolding Logic**: Include templates for `docs/MCP_CONFIG_REFERENCE.md` and `docs/PROMPT_CHEATBOOK.md`.
- **Implement Phase-1/Phase-2 Setup**: 
    - Phase 1: Create `mcp-config.json` templates with `CONFIGURE_ME` placeholders.
    - Phase 2: Complete the scaffold after user verification.
- **Add Post-Setup Instructions**: Standardize the console output to guide the user on next steps.

## 3. Exit Criteria
- `setup_project` creates a `docs/` folder with readable reference markdown.
- Two-phase setup prevents accidental overwrites of existing test structures.
