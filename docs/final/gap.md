TESTFORGE
Gap Analysis vs AppForge Gold Standard
What AppForge has · What TestForge is missing · 15 new tasks

Purpose of this document
AppForge (mobile automation) and TestForge (web/API automation) share the same MCP architecture. AppForge continued development while TestForge was on hold. This document identifies every capability AppForge has that is absent from TestForge — both in the existing codebase and in the 18-item execution plan — and produces a concrete set of new tasks to close the gap.

Scope: This is a supplement to the TestForge Agent Execution Plan, not a replacement. The 18 existing work items remain valid. These new tasks slot into the phases defined there.

Section 1 — Already done (not in any task list)
Before listing gaps, a scan of TestForge's actual src/ directory reveals services that are already implemented but were never tracked in any task or plan. These do not need to be built — but they do need to be wired into index.ts and documented.

File already in TestForge AppForge equivalent Action needed
SeleniumMigrationService.ts MigrationService.ts (Espresso/XCUITest → Appium) Register migrate_test tool in index.ts. It exists but is not exposed to the agent.
FixtureDataService.ts TestDataService.ts (faker.js factory generator) Register generate_test_data_factory tool in index.ts. Currently unreachable.
RefactoringService.ts RefactoringService.ts (duplicate steps, unused POM methods) Register suggest_refactorings tool in index.ts. Currently unreachable.
StagingService.ts TASK-44 atomic staging Verify it is wired into FileWriterService.validateAndWrite. If not, wire it.
ASTScrutinizer.ts ASTScrutinizer.ts (TASK-49) Verify it is called inside FileWriterService before the tsc check.
Questioner.ts Questioner.ts (structured clarification) Register request_user_clarification tool using existing Questioner class.

These 6 services are implemented but invisible to the agent because no tool is registered for them. Wiring them into index.ts takes < 30 min each and unlocks fully built features immediately.

 
Section 2 — Full capability comparison
Every AppForge service, utility, and tool compared against TestForge's current state. Green = covered. Amber = planned but not implemented. Red = missing.

Services
AppForge capability TestForge equivalent Status Gap type
AppiumSessionService PlaywrightSessionService Covered —
AuditLocatorService LocatorAuditService Covered —
BugReportService None Missing New task
CiWorkflowService CiWorkflowService (exists) Covered —
CodebaseAnalyzerService CodebaseAnalyzerService Covered —
ContextManager TASK-67 (planned) Planned —
CoverageAnalysisService None Missing New task
CredentialService UserStoreService Covered —
EnvironmentCheckService EnvironmentCheckService Covered —
ExecutionService TestRunnerService Covered —
FewShotLibrary + HybridPromptEngine TASK-57 (deferred) Deferred Un-defer
FileStateService TASK-66 (planned) Planned —
FileWriterService FileWriterService Covered —
GeneratedCodeValidator FileWriterService (partial) Partial —
LearningService LearningService Covered —
McpConfigService McpConfigService Covered —
MigrationService (Espresso/XCUITest) SeleniumMigrationService (exists, unwired) Unwired Wire only
MobileSmartTreeService TASK-62 (planned) Planned —
NavigationGraphService TASK-64 (planned) Planned —
ObservabilityService TASK-65 (planned) Planned —
OrchestrationService TASK-68 (planned) Planned —
PreFlightService None Missing New task
ProjectMaintenanceService ProjectMaintenanceService Covered —
ProjectSetupService ProjectSetupService Covered —
RefactoringService RefactoringService (exists, unwired) Unwired Wire only
SandboxEngine SandboxEngine Covered —
SelfHealingService SelfHealingService Covered —
SessionManager (Appium state) PlaywrightSessionService (partial) Partial —
StructuralBrainService TASK-63 (planned) Planned —
SummarySuiteService SuiteSummaryService Covered —
SystemStateService TASK-52 partial Planned —
TestDataService (faker.js) FixtureDataService (exists, unwired) Unwired Wire only
TestGenerationService TestGenerationService Covered —
TokenBudgetService TASK-47 (planned) Planned —
UtilAuditService UtilAuditService Covered —

Utilities
AppForge capability TestForge equivalent Status Gap type
ASTScrutinizer ASTScrutinizer (exists, check wiring) Covered —
FileGuard (binary sniff) None Missing New task
FileSuggester ('did you mean?') None Missing New task
JsonToPomTranspiler JsonToPomTranspiler Covered —
Logger (structured) AnalyticsService (partial) Partial —
Metrics (tool perf tracking) None Missing New task
Questioner (structured clarification) Questioner.ts (exists, unwired) Unwired Wire only
RequestTracer (unique req IDs) None Missing New task
RetryEngine (exponential backoff) None Missing New task
ScreenshotStorage (off-context) None Missing New task
SecurityUtils SecurityUtils Covered —
ShellSecurityEngine TASK-48 (planned) Planned —
StringMatcher (fuzzy LLM ops) None Missing New task
ErrorFactory / ErrorSystem ErrorCodes.ts (partial) Planned —

Tools (registered in index.ts)
AppForge capability TestForge equivalent Status Gap type
analyze_coverage None Missing New task
check_appium_ready None (no pre-flight check) Missing New task
export_bug_report None Missing New task
export_team_knowledge None (LearningService exists) Missing New task
generate_test_data_factory None (FixtureDataService unwired) Unwired Wire only
migrate_test None (SeleniumMigrationService unwired) Unwired Wire only
repair_project ProjectMaintenanceService (partial) Partial —
request_user_clarification None (Questioner.ts unwired) Unwired Wire only
suggest_refactorings None (RefactoringService unwired) Unwired Wire only
workflow_guide None Missing New task

Gold Standard (GS) enhancements — AppForge only
AppForge capability TestForge equivalent Status Gap type
GS-04: Binary File Guard None Missing New task
GS-06: Retry Engine None Missing New task
GS-08: Minimal Echoes (output rules) Not applied to any tool description Missing New task
GS-10: JIT Platform Skills (android.md/ios.md) None (web equivalent: playwright-bdd.md) Missing New task
GS-12: Max Turns Guard (heal cap = 3) None Missing New task
GS-18: FileSuggester None Missing New task
GS-19: Local Healer Cache (SQLite) None Missing New task
GS-21: Observer progress updates None Missing Low priority

 
Section 3 — New tasks to close the gap
These tasks did not exist in the original TestForge execution plan. They are ordered by priority. Each maps to an existing AppForge capability, adapted for web/API automation instead of mobile.

TASK-57 (FewShotLibrary + HybridPromptEngine) is deliberately UN-DEFERRED here. It is one of AppForge's highest-impact quality features and is fully implemented — TestForge just needs to port it.

Group A — Wire existing code (< 30 min each, no new code)

Task ID What to build Why — web/API equivalent Phase
TF-NEW-01 Wire 5 existing services as tools
Register these tools in index.ts: suggest_refactorings (RefactoringService), migrate_test (SeleniumMigrationService), generate_test_data_factory (FixtureDataService), request_user_clarification (Questioner), export_team_knowledge (LearningService.exportToMarkdown). Copy registerTool() pattern from AppForge for each. All 5 services are fully implemented in TestForge but unreachable — no tool is registered. AppForge uses all 5 in production. Phase 2 (wire during SDK migration)

Group B — Phase 1 additions (security & infrastructure)

Task ID What to build Why — web/API equivalent Phase
TF-NEW-02 RetryEngine (exponential backoff)
Create src/utils/RetryEngine.ts. Implement withRetry<T>(fn, policy) with maxAttempts, baseDelayMs, maxDelayMs, jitter, retryOn(). Define preset policies: playwrightBrowser (3 attempts, 2s base), fileWrite (2 attempts, 500ms), networkCall (5 attempts, 2s). Wire into TestRunnerService, PlaywrightSessionService, any fetch calls. Playwright browser launches fail transiently. CI environments have network blips. AppForge RetryEngine prevents LLM from manually diagnosing transient failures. Identical need in web automation. Phase 1
TF-NEW-03 FileGuard (binary file sniff)
Create src/utils/FileGuard.ts. Implement isBinary(filePath) using extension allowlist + 64KB magic-number sniff. Add readTextFileSafely(filePath). Block .png, .jpg, .wasm, .zip, .gz, .db, .map, compiled .js bundles. Wire into SandboxEngine and FileWriterService before any file read. Playwright projects contain screenshots, compiled bundles, source maps, and lock files. Without a guard, the agent wastes tokens reading binary garbage. AppForge FileGuard blocks .apk and .ipa — same problem, different extensions. Phase 1
TF-NEW-04 ScreenshotStorage (off-context screenshot management)
Create src/utils/ScreenshotStorage.ts. Store base64 screenshots to .TestForge/screenshots/{prefix}-{hash}.png. Return { filePath, relativePath, timestamp, size } instead of raw base64. Wire into DomInspectorService and any tool that captures Playwright screenshots. Prevents screenshot data from consuming entire context window. Playwright screenshots are large base64 blobs. AppForge ScreenshotStorage removes them from MCP responses to prevent context overflow — identical problem for web automation. Critical for visual healing workflows. Phase 1

Group C — Phase 2 additions (platform intelligence)

Task ID What to build Why — web/API equivalent Phase
TF-NEW-05 Un-defer: FewShotLibrary + HybridPromptEngine
Port FewShotLibrary.ts and HybridPromptEngine.ts from AppForge. Adapt CoT scaffold for web: STEP 1 check existing step defs + page objects, STEP 2 call inspect_page_dom only for new pages, STEP 3 plan files, STEP 4 execute. Adapt negative examples for web anti-patterns (XPath positional, direct DOM calls in steps, stub methods). Wire selectChampion() into TestGenerationService. This is AppForge's biggest prompt quality driver — 40%+ reduction in hallucinated locators. TASK-57 was deferred because 'it needs a mature corpus', but AppForge shows it works with even a small corpus. The anti-patterns (stubs, bad XPath) are identical in web automation. Phase 2
TF-NEW-06 RequestTracer + Metrics
Create src/utils/RequestTracer.ts: assign a short UUID to each MCP tool call. Create src/utils/Metrics.ts: recordStart(toolName) returns a stop() function; recordFailure(toolName); getSummary(). Wire into index.ts tool dispatch — every tool call gets a traceId and its duration is recorded. Dump Metrics summary on process SIGTERM. AppForge uses these for debugging multi-step agent sessions. When a session fails after 15 tool calls, the RequestTracer lets you correlate exactly which call caused the issue. Identical need in web automation — Playwright sessions are equally opaque. Phase 2
TF-NEW-07 StringMatcher (fuzzy file operation matching)
Create src/utils/StringMatcher.ts. Implement normalizeWithMap() (strip whitespace, unify quote chars). Implement fuzzyReplace(original, target, replacement) using the normalized map to find and replace content even when the LLM changes quote style or adds trailing spaces. Wire into FileWriterService for all str_replace-style operations. LLMs generate inconsistent quote styles and whitespace. AppForge StringMatcher prevents 'string not found' failures when the LLM writes single quotes but the file uses double quotes. Playwright TypeScript projects have this exact problem with template literals and multiline strings. Phase 2
TF-NEW-08 FileSuggester ('did you mean?')
Create src/utils/FileSuggester.ts. When a file read fails with ENOENT, scan the directory for files with the same name but different extension (LoginPage.js → suggest LoginPage.ts), or similar names (Levenshtein distance ≤ 2). Inject suggestions into the error response: 'File not found. Did you mean: pages/LoginPage.ts?'. Wire into FileWriterService and SandboxEngine. AppForge GS-18. Agents frequently request wrong filenames — wrong case, wrong extension, old name. Instead of a silent ENOENT crash, the agent gets a recovery hint and self-corrects without user intervention. Phase 2

Group D — Phase 3 additions (intelligence & quality)

Task ID What to build Why — web/API equivalent Phase
TF-NEW-09 PreFlightService + check_playwright_ready tool
Create src/services/PreFlightService.ts. Checks (in order): Playwright installed (npx playwright --version), configured browsers installed (npx playwright install --dry-run), baseUrl reachable (HTTP GET with 5s timeout), mcp-config.json valid. Register check_playwright_ready tool. Run checks automatically before inspect_page_dom and run_cucumber_test if not recently passed. AppForge PreFlightService prevents wasting session tokens when Appium isn't running. Web equivalent: agent calls inspect_page_dom only to find the browser binary isn't installed or the target URL is down. Same wasted turn problem. Phase 3
TF-NEW-10 CoverageAnalysisService + analyze_coverage tool
Create src/services/CoverageAnalysisService.ts. Parse feature files to count scenarios, extract page/route names from Given/When/Then steps, build a coverage heatmap per page. Identify gaps: pages with only happy-path tests (no negative), pages with zero tests, standard pages expected but missing (login, home, settings). Register analyze_coverage tool that returns the report + suggested missing scenarios. AppForge CoverageAnalysisService helps agents suggest what to test next. Web equivalent: identify which pages of the app have zero Cucumber coverage. Particularly useful after initial setup — the agent proactively suggests gap scenarios instead of waiting to be asked. Phase 3
TF-NEW-11 BugReportService + export_bug_report tool
Create src/services/BugReportService.ts. Takes testName, rawError (Playwright output), browser, baseUrl, appVersion. Classifies severity (P0/P1/P2) based on error type (timeout = P1, assertion = P2, crash = P0). Generates Jira-ready Markdown: summary, steps to reproduce, expected/actual, environment (browser + OS), raw error log (truncated to 2000 chars). Register export_bug_report tool. AppForge BugReportService converts Appium failures into Jira tickets. Web teams have the same workflow: Playwright test fails in CI, someone needs to file a Jira bug. Instead of copy-pasting raw errors, the agent produces a structured report. Phase 3
TF-NEW-12 Max Turns Guard (self-healing loop cap)
Add attemptCount: Map<string, number> to SelfHealingService. Before each heal attempt, increment counter for the testPath. If count > 3, return { success: false, reason: 'MAX_HEAL_ATTEMPTS_REACHED', suggestion: 'Call request_user_clarification — automated healing exhausted for this test.' }. Reset count on successful heal. Log the cap event via ObservabilityService. AppForge GS-12. Without a cap, self-healing loops can run indefinitely, consuming hundreds of tokens on a structurally broken test. After 3 attempts the agent should escalate to the user, not keep trying the same fix. Phase 3

Group E — Phase 4 additions (workflow & DX)

Task ID What to build Why — web/API equivalent Phase
TF-NEW-13 workflow_guide tool
Register workflow_guide tool in index.ts. Returns step-by-step sequences for: new_project (setup → config → verify), write_test (analyze → inspect DOM → generate → validate → run), run_and_heal (run → distill errors → heal → verify), debug_flaky (analyze → structural brain → DNA tracker), and all. Static data — no service needed. Inject into tool description: 'START HERE IF UNSURE.' AppForge workflow_guide is the most-used tool by new agents in a TestForge context — it tells the LLM exactly which tools to call in which order for common workflows. Prevents random tool calling. Takes 1 hour to implement, saves dozens of wasted turns per session. Phase 4
TF-NEW-14 JIT Framework Skills (browser & BDD skill files)
Create src/skills/ directory with: playwright-bdd.md (BDD-specific patterns, defineBddConfig, @Given/@When/@Then conventions, fixture usage), web-selectors.md (CSS selector priority over XPath, data-testid strategy, accessible locators), api-testing.md (Playwright request API, authentication patterns, response assertions). Load the relevant skill file content into tool responses contextually — inject playwright-bdd.md when generate_cucumber_pom is called, api-testing.md when API test steps are detected. AppForge loads android.md or ios.md based on the platform being tested — just-in-time context that doesn't flood every prompt. Web equivalent: load the relevant skill file only when the tool call context matches. Prevents generic LLM advice overriding project-specific patterns. Phase 4
TF-NEW-15 Minimal Echoes — output discipline in all tool descriptions
Add OUTPUT INSTRUCTIONS block to every tool description in index.ts: 'Do NOT repeat the file path or parameters already shown. Do NOT summarize what you just did. Briefly acknowledge completion (10 words max), then proceed to next step. Keep response under 100 words unless explaining an error.' Model on AppForge GS-08. Run after Phase 5 tool description rewrite (TASK-46) so it is applied to final descriptions. AppForge GS-08 eliminates a common failure mode: the LLM produces a 400-word summary of what it just did instead of proceeding to the next step. This wastes tokens and breaks agentic flows. Identical problem in TestForge — simple fix applied to tool descriptions. Phase 5

 
Section 4 — Updated phase slot allocation
How the 15 new tasks slot into the existing 5-phase plan from the Agent Execution Plan document.

Phase New task(s) Where it fits
Phase 1 TF-NEW-01 (partial)
TF-NEW-02, -03, -04 Add RetryEngine and FileGuard to the security hardening sweep alongside TASK-48/43/40. Add ScreenshotStorage to the atomic staging work alongside TASK-44/66. Wire RefactoringService, Questioner, SeleniumMigrationService (3 of the 5 in TF-NEW-01) during Phase 1 as they have no dependencies.
Phase 2 TF-NEW-01 (remainder)
TF-NEW-05 through -08 Wire remaining 2 services (FixtureDataService, LearningService export) alongside SDK migration. Un-defer HybridPromptEngine (TF-NEW-05) — port it alongside TASK-57's original scope. Add RequestTracer, Metrics, StringMatcher, FileSuggester to the core platform work.
Phase 3 TF-NEW-09 through -12 Add PreFlightService alongside the observability work (TASK-65). Add CoverageAnalysisService alongside StructuralBrain (TASK-63) — both are codebase intelligence tools. Add BugReportService after the error distiller (TASK-54). Add Max Turns Guard to SelfHealingService alongside TASK-61/41.
Phase 4 TF-NEW-13, -14 Add workflow_guide tool alongside orchestration work (TASK-68). Add JIT Framework Skills alongside Smart DOM and prompt compression (TASK-62/34) — both reduce context bloat.
Phase 5 TF-NEW-15 Apply Minimal Echoes output rules after TASK-46 (Caveman Protocol descriptions) so they are applied to the final tool descriptions in one pass.

Final numbers

Metric Count
Original tasks in plan 18 work items across 5 phases
New tasks added by gap analysis 15 new tasks (TF-NEW-01 to TF-NEW-15)
'Wire only' tasks (< 30 min each) 6 (existing services, just need registerTool)
Services already built but unknown 6 (SeleniumMigration, Fixture, Refactoring, Staging, ASTScrutinizer, Questioner)
AppForge capabilities now fully covered ~85% parity after new tasks complete
Intentionally not ported AppiumSessionService (mobile-only), JsonToPomTranspiler (different domain), GS-23 agent routing (premature)

The single highest-ROI action: run TF-NEW-01 first. Six fully-built features become accessible to the agent in under 3 hours of wiring work, with zero new code written.
