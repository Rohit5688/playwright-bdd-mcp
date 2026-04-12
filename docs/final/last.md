# TestForge — Master Task Execution Sequence

> **Single source of truth.** Combines the Agent Execution Plan (18 consolidated work items) and the Gap Analysis (15 new tasks from AppForge parity check) into one logical execution order.  
> Iron rule: `npm run build` must pass after every task. `npm test` at ≥ 90% coverage from Phase 2 onward.

---

## How to read this file

Each task has:
- **ID** — original task number(s) or new gap ID
- **What** — what gets built
- **Files touched** — where the code goes
- **Unblocks** — what cannot start until this is done
- **Effort** — S = ~20 min, M = ~45 min, L = ~90 min

Status markers: `✅ DONE` · `⬜ TODO` · `🔌 WIRE ONLY` (no new code, just registerTool)

---

## PHASE 1 — Foundation: Security, Integrity & Infrastructure

> Goal: stable, safe base that nothing else breaks. Every subsequent phase depends on this.

---

### 1.1 · Config System Overhaul
**IDs:** TASK-01 ✅ + TASK-04 + TASK-12  
**Effort:** S+S+S → do as one sitting  
**Files:** `src/services/McpConfigService.ts`

- [x] TASK-01 — `deepMerge()` recursive utility replacing shallow spread ✅ DONE
- [ ] TASK-04 — Add `playwrightConfig`, `tsconfigPath`, `dirs`, `browsers`, `envKeys` to `McpConfig` interface + `DEFAULT_CONFIG` + JSDoc
- [ ] TASK-12 — Separate `read()` from "enforce defaults" logic; `mtime` only updated on explicit `write()`; add `preview` mode to `manage_config`

**Unblocks:** TASK-21 (command construction), TASK-25 (extensions), all scanner fixes

---

### 1.2 · Security Hardening Sweep
**IDs:** TASK-48 + TASK-09 + TASK-43 + TASK-40 + TF-NEW-02  
**Effort:** M+M+M+M+M → one "security sprint"  
**Files:** `TestRunnerService.ts`, `SandboxEngine.ts`, `src/index.ts`, `DomInspectorService.ts`, new `src/utils/RetryEngine.ts`

- [ ] TASK-48 — Migrate `TestRunnerService` from `exec(string)` to `execFile`/`spawn` with argument arrays. Add `ShellSecurityEngine` validator.
- [ ] TASK-09 — `SandboxEngine`: `resolveSafePath` guard, prototype freezing, resource limits on VM context
- [ ] TASK-43 — Null-guard all string ops (`?.toLowerCase()`), top-level `try/catch` in all tool handlers in `index.ts`, safe `JSON.parse` wrappers
- [ ] TASK-40 — Full audit: grep for remaining `exec()`/`eval()` calls, ensure all file-writing tools use `resolveSafePath`
- [ ] TF-NEW-02 — `src/utils/RetryEngine.ts`: `withRetry<T>(fn, policy)`, preset policies for `playwrightBrowser` (3×2s), `fileWrite` (2×500ms), `networkCall` (5×2s). Wire into `PlaywrightSessionService` and `TestRunnerService`.

**Unblocks:** TF-NEW-09 (pre-flight), stable test execution

---

### 1.3 · Credential & Git Safety
**ID:** TASK-15  
**Effort:** S  
**Files:** `src/services/UserStoreService.ts`

- [ ] Auto-inject `users.{env}.json` into `.gitignore` on `manage_users` write
- [ ] Pre-validate credential paths against git-ignore rules
- [ ] Store API keys in `.env`, never in config files

---

### 1.4 · Atomic Staging + File-State Race Guard
**IDs:** TASK-44 + TASK-66 + TF-NEW-03 + TF-NEW-04  
**Effort:** M+M+M+M → one FileWriter sprint  
**Files:** `src/services/FileWriterService.ts`, new `src/services/StagingService.ts` (check if exists), new `src/utils/FileGuard.ts`, new `src/utils/ScreenshotStorage.ts`

- [ ] TASK-44 — `StagingService`: write generated files to `os.tmpdir()`, run `tsc --noEmit`, copy to `projectRoot` only on pass. `finally` purge staging dir.
- [ ] TASK-66 — `FileStateService`: record file hashes on read; block `validate_and_write` if disk hash differs from "last read hash"; force re-read before retry.
- [ ] TF-NEW-03 — `src/utils/FileGuard.ts`: `isBinary(filePath)` via extension allowlist + 64KB magic-number sniff. Block `.png`, `.jpg`, `.wasm`, `.gz`, `.db`, `.map`. Wire into `SandboxEngine` and `FileWriterService` before any file read.
- [ ] TF-NEW-04 — `src/utils/ScreenshotStorage.ts`: store base64 screenshots to `.TestForge/screenshots/{prefix}-{hash}.png`, return `{ filePath, relativePath, timestamp, size }` instead of raw base64. Wire into `DomInspectorService` and any Playwright screenshot capture.

**Unblocks:** TASK-49 (stub hunter wires into FileWriterService), all write operations safe

---

### 1.5 · Wire 3 Already-Built Services (Quick Wins)
**ID:** TF-NEW-01 (partial)  
**Effort:** S each → ~1.5h total  
**Files:** `src/index.ts` only

- [ ] 🔌 Wire `RefactoringService` → register `suggest_refactorings` tool
- [ ] 🔌 Wire `SeleniumMigrationService` → register `migrate_test` tool  
- [ ] 🔌 Wire `Questioner.ts` → register `request_user_clarification` tool

> These services are fully implemented. No new code. Just `server.registerTool()` calls modelled on AppForge equivalents.

**Unblocks:** Agent can immediately use refactoring suggestions and migration tool

---

### Phase 1 Exit Gate
```
npm run build → zero errors
npm test      → passing (coverage baseline, not yet enforced at 90%)

Verified:
[ ] mcp-config.json 3-level deep update does not lose sibling keys
[ ] TestRunnerService uses execFile — no string-concatenated shell commands
[ ] users.{env}.json appears in .gitignore after manage_users write
[ ] Generating a file with a syntax error leaves original project files untouched
[ ] Passing a binary file to SandboxEngine returns an error, not garbled text
[ ] RetryEngine retries a simulated transient failure before surfacing the error
```

---

## PHASE 2 — Core Platform: SDK + Errors + Commands + Intelligence Utils

> Goal: modernise the MCP layer, fix the command bug that breaks every non-root-config project, and add the utility layer AppForge proved essential.

---

### 2.1 · SDK Migration End-to-End
**IDs:** TASK-28 + TASK-23 + TASK-29 + TASK-39  
**Effort:** L (all one migration pass)  
**Files:** `src/index.ts` (primary), all tool handlers

- [ ] TASK-28 — Remove all `setRequestHandler(ListToolsRequestSchema)` / `setRequestHandler(CallToolRequestSchema)`. Migrate every tool to `server.registerTool()`.
- [ ] TASK-23 — Migrate first 10 tools as pattern-setters; implement `ToolResponse` wrapper; update `PromptFactory` to read annotations from code.
- [ ] TASK-29 — Add `annotations` block (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) to every `registerTool()` call. Add `structuredContent` alongside text for all JSON-returning tools.
- [ ] TASK-39 — Add Zod schemas as `outputSchema` on each `registerTool` call; validate all 30+ tool responses.

**Unblocks:** TASK-46 (caveman descriptions need registerTool), TF-NEW-15 (output rules), TF-NEW-01 remainder wiring

---

### 2.2 · Unified Error System + Defensive Parse Wrapping
**IDs:** TASK-50 + TASK-03  
**Effort:** M+S  
**Files:** new `src/types/ErrorSystem.ts`, `src/services/CodebaseAnalyzerService.ts`, `src/utils/ASTScrutinizer.ts`

- [ ] TASK-50 — `ErrorSystem.ts`: `McpErrorCode` registry (SESSION, FILE, SECURITY, RUNTIME codes), `McpError extends Error` with `retryable` boolean + `toMcpResponse()`. Update all service boundaries to throw `McpError`. Delete legacy `ErrorCodes.ts` after migration.
- [ ] TASK-03 — Wrap all `ts-morph` parse calls and XML parsing in `try/catch` using new `McpError` types. Return warnings in `analyze_codebase` instead of crashing on malformed TypeScript.

**Unblocks:** TF-NEW-12 (max turns guard references McpError), RetryEngine `isRetryableError()` check

---

### 2.3 · Command Construction + Config-Driven Paths
**IDs:** TASK-21 + TASK-20 + TASK-08  
**Effort:** M+S+S → one TestRunnerService pass  
**Files:** `src/services/TestRunnerService.ts`, `src/services/CodebaseAnalyzerService.ts`, `src/services/SuiteSummaryService.ts`

- [ ] TASK-21 — Pass `--config <playwrightConfig>` to both `bddgen` and `playwright test`. Add `--tsconfig <tsconfigPath>` to `playwright test`. Load env file per `config.currentEnvironment`.
- [ ] TASK-20 — Replace all hardcoded timeout magic numbers with `config.timeouts.testRun`, `config.timeouts.sessionStart`, `config.timeouts.healingMax`.
- [ ] TASK-08 — `CodebaseAnalyzerService` and `SuiteSummaryService` use `config.dirs` overrides instead of hardcoded `features/` and `pages/` paths.

**Unblocks:** Every test run on non-root-config projects. This is the highest everyday-usage fix.

---

### 2.4 · AST Stub Hunter
**ID:** TASK-49  
**Effort:** M  
**Files:** `src/utils/ASTScrutinizer.ts` (check if exists), `src/services/FileWriterService.ts`

- [ ] `ASTScrutinizer.scrutinize(content, path)`: detect `// TODO`, `// FIXME`, empty method bodies, AI-placeholder comments using `ts-morph` or line-scan.
- [ ] Integrate as hard-reject gate in `FileWriterService.validateAndWrite` — runs before `tsc` check.
- [ ] Return structured "Self-Healing Hint" to the LLM on rejection.

---

### 2.5 · Intelligence Utilities (AppForge parity)
**IDs:** TF-NEW-05 + TF-NEW-06 + TF-NEW-07 + TF-NEW-08  
**Effort:** M+S+M+S  
**Files:** new files in `src/utils/` and `src/services/`

- [ ] TF-NEW-05 — **Un-defer HybridPromptEngine** — `src/services/FewShotLibrary.ts` + `src/services/HybridPromptEngine.ts`. Port from AppForge. Adapt CoT scaffold for web: audit existing step defs → call `inspect_page_dom` only for new pages → plan files → execute. Adapt negative examples for web anti-patterns (positional XPath, driver calls in step defs, stubs). Wire `selectChampion()` into `TestGenerationService`.
- [ ] TF-NEW-06 — `src/utils/RequestTracer.ts`: assign short UUID to each MCP tool call. `src/utils/Metrics.ts`: `recordStart(tool)` → returns `stop()`, `recordFailure(tool)`, `getSummary()`. Wire both into `index.ts` tool dispatch. Dump `Metrics` summary on `SIGTERM`.
- [ ] TF-NEW-07 — `src/utils/StringMatcher.ts`: `normalizeWithMap()` strips whitespace, unifies all quote chars. `fuzzyReplace(original, target, replacement)` tolerates quote drift and trailing spaces. Wire into `FileWriterService` for all string-replacement operations.
- [ ] TF-NEW-08 — `src/utils/FileSuggester.ts`: on `ENOENT`, scan directory for same-name different-extension matches, or Levenshtein-≤2 names. Inject "Did you mean: pages/LoginPage.ts?" into the error response. Wire into `FileWriterService` and `SandboxEngine`.

**Unblocks:** Dramatically better generation quality (TF-NEW-05), debuggable sessions (TF-NEW-06), resilient file ops (TF-NEW-07, TF-NEW-08)

---

### 2.6 · Wire 2 Remaining Already-Built Services
**ID:** TF-NEW-01 (remainder)  
**Effort:** S+S  
**Files:** `src/index.ts` only

- [ ] 🔌 Wire `FixtureDataService` → register `generate_test_data_factory` tool (faker.js factory generator)
- [ ] 🔌 Wire `LearningService.exportToMarkdown()` → register `export_team_knowledge` tool

---

### Phase 2 Exit Gate
```
npm run build → zero errors
npm test      → passing, coverage ≥ 90% (enforced from here onward)

Verified:
[ ] No setRequestHandler calls remain in index.ts
[ ] Every tool has an annotations block
[ ] bddgen receives --config on a non-root playwright.config.ts project
[ ] A file with // TODO is rejected before reaching the filesystem
[ ] An LLM-generated file with wrong quote style is still fuzzy-matched correctly
[ ] request_user_clarification, suggest_refactorings, migrate_test all reachable
```

---

## PHASE 3 — Intelligence & Observability

> Goal: the agent understands the codebase it is modifying, every session is debuggable, and token bloat is controlled.

---

### 3.1 · Structural Brain + FDR Lockfile Engine
**IDs:** TASK-63 + TASK-71  
**Effort:** M+M → one codebase-intelligence sprint  
**Files:** new `src/services/StructuralBrainService.ts`, new `src/services/DependencyService.ts`, `src/services/CodebaseAnalyzerService.ts`

- [ ] TASK-63 — `StructuralBrainService`: scan import graph, identify God Nodes (>5 imports). Persist to `.TestForge/structural-brain.json`. Register `scan_structural_brain` tool. Inject pre-flight warnings into `validate_and_write` when a God Node is being modified.
- [ ] TASK-71 — `LockfileParser`: parse `package-lock.json` / `yarn.lock` for transitive deps. `ImportFingerprinter`: detect implicit frameworks (`defineBddConfig` pattern → playwright-bdd even if config is non-standard). Surface "Implicit Framework" findings in `analyze_codebase` output.

---

### 3.2 · Observability Service
**ID:** TASK-65  
**Effort:** M  
**Files:** new `src/services/ObservabilityService.ts`, `src/index.ts`

- [ ] JSONL logging to `projectRoot/mcp-logs/session-{timestamp}.jsonl`
- [ ] Log: tool name, input args summary, response summary, duration ms, error if any
- [ ] Secret Masker: redact env vars, passwords, tokens before logging
- [ ] Wrap all tool dispatch in `index.ts` with `toolStart` / `toolEnd` pairs

---

### 3.3 · Pre-Flight Service + check_playwright_ready Tool
**ID:** TF-NEW-09  
**Effort:** M  
**Files:** new `src/services/PreFlightService.ts`, `src/index.ts`

- [ ] Checks in order: Playwright installed → configured browsers installed → `baseUrl` reachable (HTTP GET, 5s timeout) → `mcp-config.json` valid
- [ ] Register `check_playwright_ready` tool
- [ ] Auto-run checks before `inspect_page_dom` and `run_cucumber_test` if not recently passed (cache result for 5 min)

---

### 3.4 · Token Efficiency Bundle
**IDs:** TASK-35 + TASK-54 + TASK-67 + TASK-47 + TASK-52  
**Effort:** S+M+M+S+S → one "context management" sprint  
**Files:** `src/services/ContextManager.ts` (new), `src/services/TokenBudgetService.ts` (new), `src/services/AnalyticsService.ts`, `DomInspectorService.ts`

- [ ] TASK-35 — Global `CHARACTER_LIMIT = 25000` for tool responses. Smart truncation with message: "Output truncated. Use pagination or specific queries for more detail." Apply to `inspect_page_dom`, `analyze_codebase`, `run_cucumber_test`.
- [ ] TASK-54 — `ErrorDistiller`: strip timestamps, non-critical driver logs, redundant stack traces from Playwright output. Return causal chain: Step → Selector → Root Failure. Apply to `run_cucumber_test` and `self_heal_test` outputs.
- [ ] TASK-67 — `ContextManager`: after 3 DOM scans, compress the oldest into single-line summaries. Keep latest 2 full-size. Inject compacted context into generation tool headers.
- [ ] TASK-47 — `TokenBudgetService`: heuristic token counter per session (chars ÷ 4). Register `get_token_budget` tool. Append `[Session Cost: ~N tokens]` footer to `analyze_codebase` and `inspect_page_dom`.
- [ ] TASK-52 — `ContextPulse`: append a state summary block to short-lived tool responses every 5 turns. Register `get_system_state` tool for explicit refresh.

---

### 3.5 · JSON-RPC Pipe Hardening + Error DNA
**ID:** TASK-70  
**Effort:** M  
**Files:** `src/utils/Runner.ts`, `src/services/SelfHealingService.ts`

- [ ] Refactor `Runner.ts` to `stdio: ['ignore', 'pipe', 'pipe']` — child-process logs never leak into MCP stdout
- [ ] Implement `ErrorClassifier`: parse common Playwright/shell errors into DNA codes: `Infrastructure`, `Logic`, `Transient`
- [ ] Update `self_heal_test` to receive structured Error DNA instead of raw stack trace

---

### 3.6 · Coverage Analysis + Bug Report + Max Turns Guard
**IDs:** TF-NEW-10 + TF-NEW-11 + TF-NEW-12  
**Effort:** M+M+S  
**Files:** new `src/services/CoverageAnalysisService.ts`, new `src/services/BugReportService.ts`, `src/services/SelfHealingService.ts`

- [ ] TF-NEW-10 — `CoverageAnalysisService`: parse feature files, count scenarios per page/route, build coverage heatmap, identify gaps (no negative tests, zero coverage pages, missing standard flows). Register `analyze_coverage` tool.
- [ ] TF-NEW-11 — `BugReportService`: takes `testName`, `rawError`, `browser`, `baseUrl`, `appVersion`. Auto-classifies severity (timeout=P1, assertion=P2, crash=P0). Outputs Jira-ready Markdown. Register `export_bug_report` tool.
- [ ] TF-NEW-12 — Max Turns Guard in `SelfHealingService`: `attemptCount: Map<string, number>`. If count > 3, return `MAX_HEAL_ATTEMPTS_REACHED` with suggestion to call `request_user_clarification`. Reset on successful heal. Log via `ObservabilityService`.

---

### Phase 3 Exit Gate
```
npm run build → zero errors
npm test      → passing, coverage ≥ 90%

Verified:
[ ] analyze_codebase returns a Known God Nodes list for any project
[ ] playwright-bdd detected even when playwright.config.ts is at non-standard path
[ ] mcp-logs/ grows with each session, secrets are redacted
[ ] Tool response for 100,000-char DOM is truncated with readable message
[ ] Playwright test failure returns causal chain, not raw Appium-style log dump
[ ] Heal loop stops at attempt 3 and asks for user clarification
[ ] JSON-RPC parse errors no longer appear in MCP client during verbose test output
```

---

## PHASE 4 — Autonomy & UX

> Goal: reduce agent turn counts, add autonomous capabilities, improve self-healing intelligence.

---

### 4.1 · Orchestration: Nano-Tool Consolidation + Atomic Workflows
**IDs:** TASK-55 + TASK-58 + TASK-68  
**Effort:** S+M+M → one OrchestrationService sprint  
**Files:** new `src/services/OrchestrationService.ts`, `src/index.ts`

- [ ] TASK-55 — Merge nano-tools: fold `set_credentials` + `inject_app_build` into `manage_config({operation:'write'})`. Fold `end_session` into `start_session({operation:'stop'})`. Remove standalone registrations.
- [ ] TASK-58/68 — `OrchestrationService`: implement `create_test_atomically(description, xml, screenshot)` → one-hop: analyze → generate → validate → write. Implement `heal_and_verify_atomically(error, xml)` → one-hop: heal → verify → train. Register both tools.

**Unblocks:** 2-turn reduction in standard test generation flow

---

### 4.2 · Navigation Graph + Autonomous Explorer
**IDs:** TASK-45 + TASK-64  
**Effort:** M+M → one NavigationGraphService sprint  
**Files:** new `src/services/NavigationGraphService.ts`, new `src/tools/discover_app_flow.ts`

- [ ] TASK-64 — `NavigationGraphService`: store URL graph (nodes) + transitions (edges). Persist to `.TestForge/navigation-map.json`. Export as Mermaid diagram.
- [ ] TASK-45 — Register `discover_app_flow` tool: takes start URL, clicks links/buttons to discover new URLs, updates persistent graph. Inject "Known Navigation Paths" into `analyze_codebase` output so agent knows how to reach any screen.

---

### 4.3 · Advanced Healing: DNA Tracker + Auto-Learning
**IDs:** TASK-61 + TASK-41  
**Effort:** M+S  
**Files:** new `src/services/DnaTrackerService.ts`, new `src/utils/HeuristicMatcher.ts`, `src/services/SelfHealingService.ts`

- [ ] TASK-61 — `DnaTrackerService`: persist element metadata (tag, ID, DOM hierarchy, visual hash) to `.TestForge/locator-dna.json`. `HeuristicMatcher`: LCS algorithm to find near-matches. Wire into `SelfHealingService` as first attempt before LLM fallback.
- [ ] TASK-41 — Auto-learning: on successful heal, atomically update `mcp-learning.json`. Add optional `autoTrain: true` flag to `verify_selector`. Wire into `SelfHealingService` success path.

---

### 4.4 · Smart DOM + Prompt Compression
**IDs:** TASK-62 + TASK-34  
**Effort:** M+M  
**Files:** `src/services/DomInspectorService.ts`, new `src/utils/SmartDomExtractor.ts`, `src/services/TestGenerationService.ts`

- [ ] TASK-62 — `SmartDomExtractor`: port noise-filtering logic from page-agent. `inspect_page_dom` returns pruned "Actionable Markdown" instead of raw HTML. Coordinate-based fallback for obscured element clicks.
- [ ] TASK-34 — Prompt compression for large Gherkin files (truncate to last 3 screens context). Inject Mermaid navigation graph into `generate_cucumber_pom` prompts when graph exists.

---

### 4.5 · Workflow Guide + JIT Framework Skills
**IDs:** TF-NEW-13 + TF-NEW-14  
**Effort:** S+M  
**Files:** `src/index.ts`, new `src/skills/` directory

- [ ] TF-NEW-13 — Register `workflow_guide` tool. Static data (no service). Workflows: `new_project`, `write_test`, `run_and_heal`, `debug_flaky`, `all`. Tool description says "START HERE IF UNSURE."
- [ ] TF-NEW-14 — Create `src/skills/playwright-bdd.md` (defineBddConfig, @Given/@When/@Then, fixture patterns), `web-selectors.md` (CSS-first priority, data-testid strategy, accessible locators), `api-testing.md` (Playwright request API, auth patterns). Inject relevant skill contextually: `playwright-bdd.md` when `generate_cucumber_pom` is called; `api-testing.md` when API steps detected.

---

### Phase 4 Exit Gate
```
npm run build → zero errors
npm test      → passing, coverage ≥ 90%

Verified:
[ ] heal_and_verify_atomically fixes a broken selector and updates mcp-learning.json in 1 tool call
[ ] Agent turn count for standard test generation reduced by ≥ 2
[ ] discover_app_flow on a 5-page site produces a valid Mermaid diagram
[ ] A broken locator is healed without LLM call when heuristic match exists
[ ] inspect_page_dom response is under 5,000 tokens for a typical SPA
[ ] set_credentials and end_session are removed as standalone tools
[ ] workflow_guide returns step sequences for all 5 workflow types
```

---

## PHASE 5 — Polish: DX, Documentation & Evaluation

> Only run after all implementation tasks are DONE and green. No code changes should be happening in Phase 4 at the same time.

---

### 5.1 · Setup & Upgrade UX + TSConfig Autowiring
**IDs:** TASK-69 + TASK-22 + TASK-72  
**Effort:** M+M+M → one ProjectSetupService sprint  
**Files:** `src/services/ProjectSetupService.ts`, new `src/utils/TsConfigManager.ts`, `src/templates/`

- [ ] TASK-69 — Two-phase `setup_project`: Phase 1 creates `mcp-config.json` with `CONFIGURE_ME` placeholders + `docs/` folder with `MCP_CONFIG_REFERENCE.md` and `PROMPT_CHEATBOOK.md`. Phase 2 completes scaffold after user verification. Post-setup console instructions standardised.
- [ ] TASK-22 — `syncConfigSchema` in `ProjectSetupService`: `upgrade_project` applies new config fields without overwriting custom edits. Detect missing features (reporters, credential files) and offer to install.
- [ ] TASK-72 — `TsConfigManager`: when `validate_and_write` creates a new top-level directory, auto-add it to `tsconfig.json` `compilerOptions.paths`. Create parent dirs before writing, respecting `config` permissions.

---

### 5.2 · Tool Descriptions (Caveman Protocol) + projectExtensions
**IDs:** TASK-46 + TASK-25  
**Effort:** M+M  
**Files:** `src/index.ts`, new `src/utils/ExtensionLoader.ts`

- [ ] TASK-46 — Rewrite every tool description to: `WHEN TO USE: [trigger] | WHAT IT DOES: [effect] | HOW IT WORKS: [logic]`. Add Anti-Usage notes. Add `TRIGGER: ...` / `RETURNS: ...` / `NEXT: ...` / `COST: ...` format (AppForge pattern).
- [ ] TASK-25 — `ExtensionLoader`: reads, parses, formats project-specific config files (feature flags, logger config, API registries) for prompt injection. Wire into 5 services: `generate`, `analyze`, `heal`, `run`, `check`. Tests in `src/tests/ExtensionLoader.test.ts`.

---

### 5.3 · Minimal Echoes (Output Discipline)
**ID:** TF-NEW-15  
**Effort:** S  
**Files:** `src/index.ts` (descriptions only, runs after TASK-46)

- [ ] Add `OUTPUT INSTRUCTIONS` block to every tool description: "Do NOT repeat file path or parameters. Do NOT summarise what you just did. Acknowledge in ≤10 words, then proceed. Keep response under 100 words unless explaining an error."
- [ ] Apply immediately after TASK-46 so both changes land in one final description pass.

---

### 5.4 · Documentation Audit + Test Coverage Gate + Evaluation Harness
**IDs:** TASK-27 + TASK-26 + TASK-31  
**Effort:** M+M+M → one cleanup sprint  
**Files:** `docs/`, `package.json`, `.c8rc.json`, new `evaluation.xml`

- [ ] TASK-27 — Audit all docs for stale references. Every `McpConfig` field in docs must exist in actual TypeScript interface. Create `docs/MCP_CONFIG_REFERENCE.md` if missing. Update tool names, default paths.
- [ ] TASK-26 — Install `c8`. Update `package.json` scripts: `pretest: tsc`, `test: c8 --check-coverage node --test dist/tests/`, `test:coverage`, `test:ci`. Create `.c8rc.json` with 90% threshold (80% branches). Write 5 baseline test files for services with zero coverage.
- [ ] TASK-31 — Create `evaluation.xml` with 10 read-only multi-hop QA questions testing real TestForge tool usage. Run evaluation harness. Target ≥ 80% pass rate.

---

### Phase 5 Exit Gate
```
npm run build → zero errors
npm test      → passing, coverage ≥ 90%

Verified:
[ ] setup_project creates docs/ folder with MCP_CONFIG_REFERENCE.md
[ ] upgrade_project preserves custom config values when applying new schema fields
[ ] Every tool description follows the Caveman Protocol format
[ ] All docs references match actual TypeScript interface
[ ] evaluation.xml reports ≥ 80% pass rate
[ ] Every tool has an OUTPUT INSTRUCTIONS block
```

---

## Dependency Graph (critical path only)

```
TASK-01 (done) ──► TASK-04 ──► TASK-21 ──► all test runs work
                         │
                         └──► TASK-25 (extensions)

TASK-48 ──► TASK-21 (both touch TestRunnerService — do 48 first)

TASK-50 (ErrorSystem) ──► TASK-03 (catch blocks need McpError type)
                     └──► TF-NEW-12 (max turns guard)

TASK-28 (registerTool) ──► TASK-29 (annotations need registerTool)
                      └──► TASK-39 (Zod outputSchema needs registerTool)
                      └──► TASK-46 (caveman descriptions need registerTool)
                      └──► TF-NEW-15 (output rules run after TASK-46)

TF-NEW-05 (HybridPromptEngine) ──► needs corpus from Phase 1 codebase scanner
TASK-63 (StructuralBrain) ──► TASK-44 (pre-flight warnings in validate_and_write)
TASK-61 (DNA Tracker) ──► TASK-41 (auto-learning hooks into DNA success path)
TASK-45/64 (NavGraph) ──► TASK-34 (Mermaid injection into prompts)
```

---

## Task count summary

| Category | Count |
|---|---|
| Original tasks (all docs) carried forward | 33 |
| Merged/absorbed into consolidated items | 19 |
| Dropped / deferred | 4 |
| New tasks from AppForge gap analysis | 15 |
| **Total executable work items** | **48** |
| Already done (TASK-01) | 1 |
| Wire-only tasks (no new code) | 6 |
| **Net tasks requiring new code** | **41** |

---

## Deferred (do not implement until explicitly revisited)

| Task | Reason |
|---|---|
| TASK-51 — Non-blocking job queue | High complexity, requires client-side polling. Revisit after Phase 4 if timeouts persist. |
| TASK-57 — Champion selector | Un-deferred as TF-NEW-05 (HybridPromptEngine). Champion selection is part of that work now. |
| TASK-60 — Surgical patching | Niche. Covered by atomic staging. Add if God Node edits become a bottleneck. |
| TASK-14 (CI safeguards) | Absorbed by Phase 1 security hardening (TASK-43/40 add global path guards). |
| GS-19 — Local healer cache (SQLite) | Covered by TASK-41 (mcp-learning.json). SQLite adds complexity without clear benefit yet. |
| GS-21 — Observer progress updates | Low priority. Add background progress messages only if long-running tools cause UX issues. |
| GS-23 — Agent routing (multi-model) | Premature. No evidence of need yet. |