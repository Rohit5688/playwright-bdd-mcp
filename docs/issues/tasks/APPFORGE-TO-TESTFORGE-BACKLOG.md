# TestForge — AppForge Cross-Pollination Backlog

**Status**: Reference Document (Implementation on hold — resume after AppForge reaches GA)  
**Created**: 2026-04-03  
**Purpose**: Every fix, pattern, and improvement applied to AppForge that TestForge also needs.  
This document is the source of truth for TestForge's next development phase.

> Using AppForge daily on a live project (Experian CreditWorks, 14 years SDET experience)
> generated the real-world bugs in this doc. These aren't theoretical — they were found in production.

---

## How to Use This Document

When AppForge reaches GA and TestForge development resumes:
1. Start with **Tier 1** — these block every test run
2. Each item maps to an AppForge AUDIT-xx or Issue-xx so you can copy the exact fix
3. Items marked `✅ TASK EXISTS` already have a stub task file in `docs/issues/tasks/`
4. Items marked `🆕 NEW TASK` need a new task file created before work starts

---

## 🔴 Tier 1: Blocks Core Workflow (Fix First)

These issues make TestForge unusable on non-trivial projects. Equivalent AppForge issues
were rated Critical or High.

---

### TF-CROSS-01 — `run_playwright_test` crashes when `mcp-config.json` has unexpected shape

**AppForge equivalent**: Issue 10a — `TypeError: Cannot read properties of undefined (reading 'executionCommand')`  
**TestForge risk**: Same optional chaining gap exists in `TestRunnerService.ts`  
**TASK**: ✅ TASK-21 covers this (config-driven command construction)

**Pattern to copy from AppForge fix (Issue 10a):**
```typescript
// BROKEN — crashes if config.project is undefined
config?.project.executionCommand

// FIXED — safe optional chain everywhere
config?.project?.executionCommand
```

**Rule**: Every `config.x.y` access in `index.ts` must be `config?.x?.y`. Grep for
`config\.` (without `?.`) in `src/index.ts` and fix all instances. Do not trust config shape.

---

### TF-CROSS-02 — `validate_and_write` staging tsconfig uses absolute paths (breaks CI)

**AppForge equivalent**: AUDIT-15  
**TestForge**: `FileWriterService.ts` — staging tsconfig for TypeScript validation uses
absolute `projectRoot` paths. Fails on CI because dev machine paths don't match.

**Fix pattern (from AppForge TASK-16):**
```typescript
// BROKEN
extends: tsconfigPath,              // absolute C:\Users\Rohit\... path
include: [path.join(projectRoot, '**/*.ts')]  // absolute path

// FIXED
extends: path.relative(stagingDir, tsconfigPath).replace(/\\/g, '/'),
include: ['**/*.ts']  // relative from stagingDir
```

**TASK**: ✅ TASK-07 partially covers this. Add CI path fix explicitly to Done Criteria.

---

### TF-CROSS-03 — `summarize_suite` counts features not scenarios

**AppForge equivalent**: Issue 13  
**TestForge**: `SuiteSummaryService.ts` — if it has the same feature/scenario counting bug,
it reports `0 scenarios` even when tests ran.

**Fix pattern (from AppForge Issue 13):**
```typescript
// BROKEN — counts feature objects, not scenario objects
const passed = report.filter(f => f.status === 'passed').length;

// FIXED — iterate feature.elements for scenarios
let passed = 0, failed = 0, totalDuration = 0;
for (const feature of report) {
  for (const scenario of (feature.elements ?? [])) {
    const scenarioPassed = scenario.steps.every(s => s.result.status === 'passed');
    scenarioPassed ? passed++ : failed++;
    totalDuration += scenario.steps.reduce((sum, s) => sum + (s.result.duration ?? 0), 0);
  }
}
```

**TASK**: 🆕 NEW TASK — Create `TASK-28-summarize-suite-fix.md`.  
Check `SuiteSummaryService.ts` to verify if this bug exists before creating the task.

---

### TF-CROSS-04 — `suggest_refactorings` flags all page methods as unused (false positives)

**AppForge equivalent**: Issue 12 — "Impact: A developer following the report would delete ALL page methods"  
**TestForge**: `SuggestRefactoringService.ts` — same string-match scanner that misses
`page.method()` dot-notation calls will have the same problem.

**Fix pattern (from AppForge TASK AppForge-12):**
```typescript
// BROKEN — matches method name but misses "page.method()" call pattern
const isUsed = stepFiles.some(f => f.includes(methodName));

// FIXED — search for "instanceName.methodName(" and "this.methodName("
const isUsed = stepFiles.some(f =>
  f.includes(`.${methodName}(`) || f.includes(`this.${methodName}(`)
);
```

Also add a mandatory `[WARNING: High False-Positive Risk]` banner to all output from this tool.

**TASK**: 🆕 NEW TASK — Create `TASK-29-refactoring-false-positives.md`.

---

### TF-CROSS-05 — `McpConfigService.read()` mutates disk on every read call (AUDIT-02 / AUDIT-16)

**AppForge equivalent**: AUDIT-02 + AUDIT-16  
**TestForge**: `McpConfigService.ts` — if `read()` calls any migration or `write()` internally,
every read-only tool call (e.g., `summarize_suite`, `audit_locators`) is silently writing to disk.

**Pattern to check:**
```typescript
// DANGEROUS — if read() calls write() for migration
public read(projectRoot: string): McpConfig {
  const raw = JSON.parse(fs.readFileSync(...));
  if (!raw.version || raw.version < CURRENT_VERSION) {
    raw.version = CURRENT_VERSION;
    this.write(projectRoot, raw);  // ← SIDE EFFECT on every read
  }
  return raw;
}
```

**Fix**: Move migration into a standalone `migrateIfNeeded()` called ONLY from `setup_project`
and `upgrade_project`. All other `read()` calls must be pure (no writes).

**TASK**: ✅ TASK-01 fixed deep merge. Check if read() also causes side-effects in TestForge.
If yes, add as explicit step to TASK-04.

---

## 🟠 Tier 2: Degrades Daily Usability

These issues don't crash the tool but produce wrong, misleading, or incomplete output.
Confirmed real-user pain from the AppForge production review.

---

### TF-CROSS-06 — `generate_ci_pipeline` uses hardcoded project values instead of config

**AppForge equivalent**: Issue 16 — hardcoded `iPhone 14`, `npx cucumber-js`, `reports/`  
**TestForge**: `generate_ci_pipeline` in `index.ts` — likely hardcodes:
- `npx playwright test` instead of reading `config.executionCommand`
- `chromium` instead of reading `config.browsers`
- `playwright-report/` instead of reading `config.reporting.outputDir`

**Fix pattern**: Before generating the CI YAML, read:
```typescript
const cmd = config.executionCommand ?? 'npx playwright test';
const browsers = config.browsers ?? ['chromium'];
const reportDir = config.reporting?.outputDir ?? 'playwright-report';
```

**TASK**: 🆕 NEW TASK — Create `TASK-30-ci-pipeline-config-aware.md`.

---

### TF-CROSS-07 — File glob scans sweep `node_modules/`, `.venv/`, test data folders

**AppForge equivalent**: Issue 14a — YAML glob swept Python `.venv/` packages  
**TestForge**: `analyze_codebase` — when scanning for `.feature` files and Page Objects,
does the scanner exclude `node_modules/`, `dist/`, `.git/`, and virtual envs?

**Tokens wasted**: If `node_modules/**/*.ts` is included, thousands of type definition files
get scanned. This blows up context and returns noise.

**Fix pattern**:
```typescript
const ALWAYS_EXCLUDE = [
  'node_modules', 'dist', '.git', '.venv', '__pycache__',
  'crew_ai', 'coverage', '.nyc_output', 'playwright-report'
];

// Apply to all glob patterns
glob('**/*.feature', { ignore: ALWAYS_EXCLUDE.map(d => `**/${d}/**`) })
```

**TASK**: ✅ TASK-08 covers scanner paths. Explicitly add glob exclusion to its Done Criteria.

---

### TF-CROSS-08 — `manage_users` writes helper file to hardcoded `test-data/` directory

**AppForge equivalent**: AUDIT-08 — helper written to hardcoded `utils/` dir  
**TestForge**: `EnvManagerService.ts` or `manage_users` handler — the generated `getUser()` helper
may be written to a hardcoded path instead of `config.dirs.testData`.

**Fix**:
```typescript
// BROKEN
const helperPath = path.join(projectRoot, 'test-data', 'getUser.ts');

// FIXED
const testDataDir = config.dirs?.testData ?? 'test-data';
const helperPath = path.join(projectRoot, testDataDir, 'getUser.ts');
```

**TASK**: ✅ TASK-12 covers user store. Add path check to its Done Criteria.

---

### TF-CROSS-09 — `set_credentials` / `manage_env` no `.gitignore` guard for secrets

**AppForge equivalent**: AUDIT-09  
**TestForge**: `EnvManagerService.ts` — when `manage_env write` adds credentials (tokens,
passwords, API keys), it must check `.gitignore` contains `.env` before writing.
If not in `.gitignore`, automatically append it and warn the user.

**Fix pattern**:
```typescript
const gitignorePath = path.join(projectRoot, '.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, 'utf-8') : '';

if (!gitignoreContent.includes('.env')) {
  fs.appendFileSync(gitignorePath, '\n# Auto-added by TestForge\n.env\n');
  // Warn user in response: "⚠️ Added .env to .gitignore to protect your credentials"
}
```

**TASK**: 🆕 NEW TASK — Create `TASK-31-gitignore-guard.md`.

---

### TF-CROSS-10 — `workflow_guide` has no `onFailure` recovery branches

**AppForge equivalent**: AUDIT-14 / AppForge TASK-07  
**TestForge**: `workflow_guide` in `index.ts` returns 5 workflows but none have `onFailure`
handling. When an LLM hits an error in step 3, it has no guidance — it loops or halts.

**Fix pattern (add to each step)**:
```typescript
{
  step: "2. inspect_page_dom — Get accessibility tree and locators",
  onFailure: "If the URL is unreachable, go back to check_environment to verify BASE_URL. If the page requires login, use loginMacro parameter."
}
```

**TASK**: 🆕 NEW TASK — Create `TASK-32-workflow-guide-recovery.md`.

---

### TF-CROSS-11 — `audit_locators` hardcoded page method checklist gives misleading score

**AppForge equivalent**: Issue 17 — hardcoded 4-method checklist  
**TestForge**: `LocatorAuditService.ts` — the audit checks fixed patterns but for large
projects with 50+ Page Objects, the percentage score is meaningless.

**Fix**: Report as "locator strategy distribution" (X% getByRole, Y% XPath, Z% CSS class)
rather than a percentage against a fixed checklist. Add clear labeling that this is a
*quality* report, not a *coverage* report.

**TASK**: 🆕 NEW TASK — Create `TASK-33-audit-locators-strategy-report.md`.

---

## 🟡 Tier 3: Architecture Patterns to Port

These are structural improvements made in AppForge that TestForge needs for consistency
and long-term maintainability.

---

### TF-CROSS-12 — Structured `TestForgeError` with session prerequisites

**AppForge equivalent**: `AppForgeError` pattern added in Production Hardening  
**TestForge**: TASK-06 is planned but is a stub. Copy the AppForge error pattern exactly.

**What AppForge implemented:**
- `AppForgeError` class with `code`, `message`, `fixHint`, `requiresSession` fields
- Tool handlers that require an active session return `AppForgeError` with
  `{ code: 'SESSION_REQUIRED', requiresSession: true }` before doing any work
- The LLM sees this structured error and knows to call `start_session` first

**TestForge tools that need session prerequisites**:
- `verify_selector` → requires active session
- `navigate_session` → requires active session
- `inspect_page_dom` within active session mode → requires active session

**TASK**: ✅ TASK-06 — Expand from stub to full implementation following AppForge pattern.

---

### TF-CROSS-13 — `generate_ci_pipeline` `projectRoot` write-path not validated

**AppForge equivalent**: AUDIT-05 — `generate_ci_workflow` writes without validation  
**TestForge**: `generate_ci_pipeline` in `index.ts` — does it call `validateProjectRoot()`
before writing `.github/workflows/*.yml`? If not, a crafted `projectRoot` with `../` can
write outside the project.

**Fix**: Add `validateProjectRoot(args.projectRoot)` as the FIRST line of every tool handler
that performs file writes. This is identical to the AppForge fix.

**TASK**: ✅ TASK-03 covers defensive boundaries. Add projectRoot validation to its checklist.

---

### TF-CROSS-14 — `execute_sandbox_code` `readFile` API reads arbitrary paths

**AppForge equivalent**: AUDIT-06  
**TestForge**: `SandboxEngine.ts` — the `forge.api.readFile(filePath)` API in the sandbox
context must validate that `filePath` resolves within `projectRoot` before reading.

**Fix**:
```typescript
readFile: async (filePath: string) => {
  const resolved = path.resolve(projectRoot, filePath);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Security: readFile path escapes projectRoot: ${filePath}`);
  }
  return fs.readFileSync(resolved, 'utf-8');
}
```

**TASK**: ✅ AppForge AUDIT-06 is already tracked in AppForge. TestForge has `SandboxEngine.test.ts`
but check if the path traversal test case exists. If not, add it.

---

### TF-CROSS-15 — Dual-field tool descriptions not yet applied uniformly

**AppForge equivalent**: Production Hardening — normalizing all 24 tool descriptions  
**TestForge**: TASK-05 — every tool description must follow:
```
WHEN TO USE: [trigger phrase]\nWHAT IT DOES: [one line]\nHOW IT WORKS: [mechanism]
```

This is the single biggest LLM routing improvement. Without it, the LLM guesses which tool
to call based on the tool name alone. With it, it routes correctly.

**Pattern to copy**: Read any 3 AppForge tool descriptions from `src/index.ts` and
apply the same template to all 18+ TestForge tools.

**TASK**: ✅ TASK-05 — Change status from TODO to PRIORITY after AppForge GA.

---

### TF-CROSS-16 — `self_heal_test` is a prompt generator, not a result producer

**AppForge equivalent**: Issue 15  
**TestForge**: `SelfHealingService.ts` — the current self-heal likely returns a markdown
prompt template expecting the LLM to process it. This creates an awkward two-hop call.

**Better pattern** (partially implemented in AppForge after Issue 15):
```typescript
// Return BOTH the best-guess candidate AND the prompt
return {
  candidates: [
    { selector: 'getByRole("button", { name: "Submit" })', confidence: 0.9, rationale: '...' }
  ],
  healInstruction: "Playwright-BDD self-heal guidance...",  // The prompt context for LLM
  pageUrl: args.pageUrl  // For re-inspection during self-heal
};
```

The LLM gets candidates it can immediately apply AND context to reason further if needed.

**TASK**: 🆕 NEW TASK — Create `TASK-34-self-heal-structured-output.md` (post-GA, complex).

---

## Summary: New Tasks to Create Before Resuming

The following task files need to be created when TestForge development resumes:

| Task | Title | Tier | Effort |
|------|-------|------|--------|
| TASK-28 | Fix `summarize_suite` feature vs scenario counting | 1 | Small |
| TASK-29 | Fix `suggest_refactorings` false positives on all methods | 1 | Medium |
| TASK-30 | Make `generate_ci_pipeline` read execution command from config | 2 | Small |
| TASK-31 | Add `.gitignore` guard to `manage_env` credential writes | 2 | Small |
| TASK-32 | Add `onFailure` recovery branches to `workflow_guide` | 2 | Small |
| TASK-33 | Reframe `audit_locators` as strategy distribution, not checklist score | 2 | Small |
| TASK-34 | Refactor `self_heal_test` to return candidates + structured output | 3 | Large |
| TASK-35 | Implement dynamic architecture discovery and persist to `mcp-config.json` | 4 | Medium |
| TASK-36 | Implement Zero-Trust AST Scanner to block lazy scaffolding | 4 | Medium |
| TASK-37 | Rip out `Questioner.clarify()` entirely to eliminate blocking loops | 4 | Medium |
| TASK-38 | Implement global defensive `try/catch` and `?.toLowerCase()` null guards | 4 | Small |

---

## 🟣 Tier 4: Deep Insights from AppForge Git History

Reviewing the actual commit logs of AppForge revealed critical architectural shifts and stability improvements that must be replicated in TestForge.

### TF-CROSS-17 — Dynamic Architecture Detection & Persistence
**AppForge commit**: `79cb901db` — *persist dynamically detected architecture paths to mcp-config memory*
**TestForge gap**: `analyze_codebase` shouldn't just read ASTs based on hardcoded guesses. It must scan the whole workspace, deduce where the page objects / feature files actually live, and **persist** those exact paths back into `mcp-config.json`. This guarantees future tools don't have to guess or scan the entire tree again.
**TASK**: 🆕 NEW TASK — Create `TASK-35-dynamic-arch-persistence.md`

### TF-CROSS-18 — Zero-Trust AST Scanner to Block LLM Lazy Scaffolding
**AppForge commit**: `713c6bce2` — *Implement Zero-Trust AST Scanner to block LLM lazy scaffolding*
**TestForge gap**: TestForge must defensively check code generated by its own tools (e.g., in `validate_and_write`) to reject placeholders like `// TODO: implement logic`. The AST scanner should enforce functional completeness before writing state to disk.
**TASK**: 🆕 NEW TASK — Create `TASK-36-zero-trust-scaffold-check.md`

### TF-CROSS-19 — Eradicate `Questioner.clarify()` Blocking Loops
**AppForge commit**: `1249951a9` — *remove last Questioner.clarify() from McpConfigService corrupt config handler*
**TestForge gap**: `Questioner.clarify()` breaks agentic flow by triggering infinite required-input loops. AppForge eradicated it in favor of strictly rejecting bad state and returning a structured LLM error containing recovery steps. TestForge must purge ALL `Questioner.clarify()` usages.
**TASK**: 🆕 NEW TASK — Create `TASK-37-purge-questioner-loops.md`

### TF-CROSS-20 — Process-Crashing JSON/XML Parsing & Null Guards
**AppForge commit**: `c8df84c11`, `c49f55aa2`, `8a6723584` — *harden XML parsing, harden toLowerCase calls, apply try-catch envelope around JSON*
**TestForge gap**: Every `JSON.parse` and unverified `stdout` from a spawned shell process must be enclosed in a `try/catch`. String operations like `toLowerCase()` must be null-guarded `?.toLowerCase()`. This ensures tool invocations fail gracefully and return the raw output back to the LLM instead of crashing the MCP server process.
**TASK**: 🆕 NEW TASK — Create `TASK-38-global-defensive-guards.md`

### TF-CROSS-21 — Atomic Staging via `os.tmpdir()` to Prevent Corrupt State
**AppForge commit**: `b35c45d` — *ProjectSetupService: atomic staging via os.tmpdir() to prevent corrupt project state on mid-run failure*
**TestForge gap**: TestForge currently writes generated files directly to the target project directory. If the LLM throws an error mid-generation or validation fails, it leaves the user's project in a corrupted half-state. TestForge needs to stage all files to `os.tmpdir()` first, validate them (tsc, etc.), and only copy them to the target directory as the final atomic step.
**TASK**: 🆕 NEW TASK — Create `TASK-39-atomic-staging.md`

### TF-CROSS-22 — Surface AST Warnings directly to LLM
**AppForge commit**: `b35c45d` — *CodebaseAnalyzerService: surface ASTScrutinizer warnings to LLM; previously warnings were silently swallowed*
**TestForge gap**: When parsing code fails or generates warnings, TestForge often silently catches the error and returns a degraded response. This hides context from the LLM. TestForge must serialize these warnings and return them in the tool payload so the LLM can self-correct the behavior.
**TASK**: 🆕 NEW TASK — Create `TASK-40-surface-ast-warnings-to-llm.md`

### TF-CROSS-23 — Mitigate JSON-RPC Pipe Corruption via Log Level Supression
**AppForge commit**: `b35c45d` — *restore logLevel:'error' on WDio client to prevent stdout JSON-RPC pipe corruption*
**TestForge gap**: Playwright and other underlying tools emit debug logs to `stdout`. MCP relies on standard I/O for its JSON-RPC protocol. If Playwright leaks logs to raw `stdout`, it irreparably breaks the MCP connection protocol. TestForge must guarantee all underlying runners operate silently or strictly redirect their internal logs to a distinct file / `stderr`.
**TASK**: 🆕 NEW TASK — Create `TASK-41-json-rpc-pipe-protection.md`

### TF-CROSS-24 — Perimeter `validateArgs` Robustness
**AppForge commit**: `b35c45d` — *restore robust validateArgs (catches null/empty-string)*
**TestForge gap**: Tool parameters are currently assumed to be valid if they pass the JSON schema check. But LLMs frequently hallucinate empty strings `""` or `null` for required text. TestForge needs runtime validation inside `index.ts` immediately at the handler entry-point to reject these explicitly, returning clear parameter errors instead of crashing deep in logic.
**TASK**: 🆕 NEW TASK — Create `TASK-42-perimeter-arg-validation.md`

---

## What AppForge Has That TestForge Is Missing Entirely

These features exist in AppForge but have no equivalent in TestForge yet:

| Feature | AppForge Tool | TestForge Gap |
|---------|--------------|---------------|
| Knowledge persistence | `train_on_example` + `export_team_knowledge` | ✅ EXISTS — verify parity |
| Bug report export | `export_bug_report` → Jira | ✅ `export_jira_bug` EXISTS — verify parity |
| Browser session management | `start_appium_session` / `end_appium_session` | `start_session` / `end_session` — verify recovery flow parity |
| Codebase sandbox analysis | `execute_sandbox_code` (Turbo Mode) | ✅ EXISTS — verify security parity (AUDIT-06/07) |
| Credential service | `set_credentials` | `manage_env write` — verify .gitignore guard (TF-CROSS-09) |
| Snapshot-based inspection | Live session XML → compact snapshot | TestForge uses DOM accessibility tree — already better architecture |
| Two-phase project setup | TASK-21 (planned) | TASK-10 (planned) — same pattern |

---

## The QA Developer Gap — What to Focus On Going Forward

Based on your background: your **domain knowledge is an asset, not a liability**.  
The product-thinking gaps are all learnable and specific:

1. **Error messages are UX.** Before shipping any tool: pretend you're using it for  
   the first time at 10pm before a release. What error would break you? What message  
   would save you? That message is what the exception should say.

2. **Write the README before the code.** If you can't write a 5-step quick-start that  
   works end-to-end, the feature isn't ready. The quick-start IS the acceptance test.

3. **Your daily testing IS your product roadmap.** Every time you notice friction,  
   open a file in `docs/issues/` and write one sentence. That sentence becomes a task.  
   This document was built entirely from that practice.

4. **Ship partial but solid.** `train_on_example` + `export_team_knowledge` in AppForge  
   scored 9/10 in the production review. That single feature pair is publishable right now.  
   Don't wait for the whole tool to be perfect before showing it.
