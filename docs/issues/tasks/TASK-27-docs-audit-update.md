# TASK-27 — Documentation Audit & Update (Both Repos)

**Status**: TODO  
**Applies To**: TestForge (`c:\Users\Rohit\mcp\TestForge\docs`) + AppForge (`c:\Users\Rohit\mcp\AppForge\docs`)  
**Tier**: Cross-cutting (run AFTER all implementation tasks in current tier are DONE)  
**Effort**: Medium (~60 min)  
**Depends on**: All Tier 1-3 tasks completed (docs should reflect implemented changes, not future plans)  
**Build check**: No build — but run a link-check pass: every `McpConfig` field referenced in docs must exist in the actual TypeScript interface.

---

## Context (No Prior Chat Needed)

Both repos have accumulated documentation drift. Config reference docs, setup guides, and
architecture docs reference old defaults, missing fields, and outdated tool descriptions.

This task: **doc audit only** — find every stale reference and update it. No code changes.

---

## TestForge Docs to Update

### File 1: Check if `docs/MCP_CONFIG_REFERENCE.md` exists

If it does NOT exist, create it based on the AppForge template.
It must document every field in the `McpConfig` interface added in TASK-04:

```markdown
# TestForge MCP Config Reference

## Core Fields
- `projectRoot` — ...
- `currentEnvironment` — ...
- `environments` — ...

## Playwright Settings
- `playwrightConfig` — relative path to playwright.config.ts when not at root
- `tsconfigPath` — relative path to tsconfig.json; always passed as --tsconfig when set

## Directory Layout
- `dirs.features` — default: "features"
- `dirs.pages` — default: "pages"
- `dirs.stepDefinitions` — default: "step-definitions"
- `dirs.testData` — default: "test-data"

## Execution
- `browsers` — default: ["chromium"]
- `executionCommand` — custom command override
- `testRunTimeout` — default: 120000 (ms)
- `defaultArgs` — appended to every test run

## Context System
- `repoContext` — static facts for the LLM (team conventions, architecture)
- `projectExtensions` — dynamic file-backed config injection (see project-extensions-design.md)

## Environment
- `envKeys.baseUrl` — default: "BASE_URL"
- `envKeys.environment` — default: "TEST_ENVIRONMENT"
```

### File 2: `docs/issues/tasks/README.md`

Check that all 27 tasks (TASK-01 through TASK-27) are listed in the README.
Tasks added after the initial README was written (TASK-17 through TASK-27) may be missing.
Verify the execution order in each tier is correct.

### File 3: Any existing `docs/SETUP.md` or `README.md`

Update any references to:
- Old `mcp-config.json` structure (before TASK-04 expansion)
- Hardcoded `playwright.config.ts` at root (now configurable)
- `BASE_URL` as the only env var name (now `config.envKeys.baseUrl`)
- `"test": "node --test dist/tests/"` (now includes c8 after TASK-26)

---

## AppForge Docs to Update

### File 1: `docs/MCP_CONFIG_REFERENCE.md`

Open and audit against the current `McpConfig` interface in `src/services/McpConfigService.ts`.

For each field in the interface, verify it appears in the reference doc with:
- What it does
- Default value
- Example value
- Which tools use it

Fields likely missing (added in TASK-17, TASK-18):
- `tsconfigPath`
- `projectExtensions`
- `codegen.*` (all 6 sub-fields)
- `timeouts.*`
- `selfHeal.*`
- `reporting.*`

### File 2: `docs/issue/tasks/README.md`

Verify all tasks 9-22 are listed with correct status (DONE/TODO).
Add any new tasks added after the last README update.

### File 3: `ARCHITECTURE.md`

Update the architecture diagram/description to reflect:
- Two-phase setup (TASK-21)
- projectExtensions injection pipeline
- Config-driven path resolution

### File 4: Root `README.md`

Check the quick-start guide still works end-to-end based on current code.
Update any `mcp-config.json` examples to include the new required/optional fields.

---

## Cross-Repo: `project-extensions-design.md`

The design doc lives in `c:\Users\Rohit\mcp\TestForge\docs\issues\project-extensions-design.md`.
After TASK-25 is done, update it to change "Implementation Plan" section from future tense to past tense
and mark it as "IMPLEMENTED".

Add a copy reference or symlink note in AppForge docs so AppForge readers can find it.

---

## Verification Process

For each doc file updated:
1. Read the TypeScript interface in the actual source file
2. Compare every field mentioned in the doc against the interface
3. For config fields: verify default value in `DEFAULT_CONFIG` matches what the doc says
4. For tool descriptions: verify the tool name matches what's in `index.ts`'s switch statement

**Stale content audit checklist:**
```
☐ No doc references playwright.config.ts as always being at root
☐ No doc uses hardcoded BASE_URL as the only accepted env key name
☐ No doc says browsers = chromium + firefox (should say config-driven, default chromium)
☐ No doc references the old 1-phase setup flow
☐ All new McpConfig fields (TASK-04, TASK-18) documented
☐ projectExtensions documented with example
☐ test coverage policy documented in contributing guide
```

---

## Done Criteria
- [ ] TestForge `MCP_CONFIG_REFERENCE.md` created or updated — all TASK-04 fields documented
- [ ] TestForge tasks README lists all 27 tasks in correct tier order
- [ ] AppForge `MCP_CONFIG_REFERENCE.md` audited — all TASK-18 fields added
- [ ] AppForge `ARCHITECTURE.md` reflects two-phase setup and extension pipeline
- [ ] Root `README.md` quick-start guides work for the current codebase (both repos)
- [ ] `project-extensions-design.md` updated to mark Phase 1 (schema) as DONE after TASK-04/25 complete
- [ ] No doc references features that were changed but not updated
- [ ] Change `Status` above to `DONE`
