TESTFORGE
Agent Execution Plan
5 Phases · 18 Work Items · Consolidated from 52 tasks

How to use this document
This document is the single source of truth for the TestForge hardening project. It replaces the 52 individual task files in /docs/issues/tasks/ with a consolidated, sequenced execution plan.

Each phase must reach a passing npm run build before the next phase begins. Never skip phases — later phases depend on foundations laid in earlier ones.

Opening message for any new chat session: Read the phase you are working on in the TestForge Agent Execution Plan. Follow only the tasks listed under that phase. Make only the changes described. Run npm run build after every task. Mark each checkbox done when the build passes.

Iron rules (apply to every phase)
• Run npm run build after every individual task — not just at the end of a phase.
• If the build fails, fix it before touching the next task. Never compound failures.
• From Phase 2 onward: npm test must also pass and coverage must stay at or above 90%.
• Make only the changes described. Scope creep breaks sequential dependency chains.
• When a task says 'one PR', implement it in one focused commit — not split across sessions.

 
PHASE 1 — Foundation: Security & Integrity
Do this phase first. Everything else depends on it. The config deep-merge fix alone unblocks 9 downstream tasks.

Work items
Task(s) What to implement Why merged / kept
TASK-01
TASK-04
TASK-12 Config system overhaul
Fix the shallow-merge bug in McpConfigService.merge(). Add the missing interface fields (playwrightConfig, tsconfigPath, dirs, browsers, envKeys). Refactor read() to separate 'Read' from 'Enforce Defaults' so reading config never writes to disk. All three touch the same file in sequence — deep merge first, then schema expansion on top, then pure read refactor. Three PRs on one file is noise.
TASK-48
TASK-09
TASK-43
TASK-40 Security hardening sweep
Migrate TestRunnerService from exec(string) to execFile/spawn with argument arrays. Harden SandboxEngine against path traversal and prototype pollution. Add null-guards (optional chaining) to all tool handlers. Audit entire codebase for remaining exec/eval calls. TASK-48 migrates exec → execFile, TASK-43 null-guards the same handlers, TASK-40 audits stragglers. Implement once as a security sweep instead of creating partial protection across three PRs.
TASK-15 Credential & Git safety
Implement automatic .gitignore injection when UserStoreService writes users.{env}.json. Validate all credential paths against git-ignore rules before writing. Ensure API keys land in .env, not config files. Standalone — completely different file. Ship fast; credential leaks are high-risk.
TASK-44
TASK-66 Atomic staging + race condition guard
Implement StagingService that writes generated files to os.tmpdir(), runs tsc --noEmit, then copies to projectRoot only if validation passes. Add FileStateService to record file hashes on read; block writes if the file changed externally since it was last read. Both gate on the same FileWriterService.validateAndWrite function. Implement in one pass — staging sets up the write pipeline, file-state checks guard the commit step.

Phase 1 exit criteria
[ ] npm run build passes with zero errors in TestForge
[ ] mcp-config.json can handle 3-level deep object updates without losing sibling keys
[ ] TestRunnerService uses execFile — no string-concatenated shell commands remain
[ ] users.{env}.json is listed in .gitignore automatically after manage_users write
[ ] Writing generated files with a syntax error leaves the original project files untouched
[ ] Passing an invalid TypeScript file to analyze_codebase returns warnings, not a crash

Dependency note: TASK-04 (McpConfig interface) must be committed before starting Phase 2. TASK-21 (command construction) and TASK-22 (env check) both read fields added in TASK-04.

 
PHASE 2 — Core Platform: SDK + Errors + Commands
Modernise the MCP server layer and fix the command-construction bug that breaks every test run on non-root-config projects.

Work items
Task(s) What to implement Why merged / kept
TASK-23
TASK-28
TASK-29
TASK-39 SDK migration: registerTool end-to-end
Remove the deprecated setRequestHandler(ListToolsRequestSchema) / setRequestHandler(CallToolRequestSchema) pattern entirely. Migrate every tool to server.registerTool(). Add annotations (readOnlyHint, destructiveHint, idempotentHint) to every tool. Add structuredContent alongside text responses for JSON-returning tools. Add Zod schemas as outputSchema on each registerTool call. TASK-23 and TASK-28 are literally the same migration written twice. TASK-29 adds annotations that require registerTool. TASK-39 adds Zod outputSchema that requires registerTool. One PR modernises the entire SDK layer.
TASK-50
TASK-03 Unified error system + defensive parse wrapping
Create src/types/ErrorSystem.ts with McpErrorCode registry (Session, File, Security, Runtime), McpError class extending Error with retryable boolean and toMcpResponse(). Wrap all ts-morph and XML parse calls in try/catch using the new McpError types. Return warnings instead of crashing on bad TypeScript files. You cannot write the catch blocks in TASK-03 without the error type from TASK-50. One PR.
TASK-21
TASK-20
TASK-08 Command construction + config-driven paths
Fix TestRunnerService to pass --config <playwrightConfig> to both bddgen and playwright test. Add --tsconfig <tsconfigPath> to playwright test invocation. Replace all hardcoded magic-number timeouts with config.timeouts.testRun / sessionStart / healingMax. Fix CodebaseAnalyzerService and SuiteSummaryService to use config.dirs overrides instead of hardcoded features/ and pages/ paths. All three fix 'TestRunnerService ignores config' — same call chain, same PR.
TASK-49 AST stub hunter
Create ASTScrutinizer utility in src/utils/. Detect // TODO, // FIXME, empty method bodies, and AI-placeholder comments using ts-morph or line-scan. Integrate into FileWriterService.validateAndWrite as a hard-reject gate before the tsc check. Return a structured self-healing hint to the LLM when a stub is found. Clean standalone utility with a clear integration point. Ship independently.

Phase 2 exit criteria
[ ] npm run build passes — no deprecated setRequestHandler calls remain in index.ts
[ ] Every tool has an annotations block in its registerTool call
[ ] Running bddgen on a project where playwright.config.ts is not at root succeeds
[ ] analyze_codebase on a project with features/ at a non-standard path returns actual results
[ ] An LLM-generated file containing // TODO is rejected before reaching the filesystem
[ ] A service throwing an unhandled error returns a structured McpError response, not a process crash

 
PHASE 3 — Intelligence & Observability
Give the agent structural awareness of the codebase it is modifying, and make every session debuggable.

Work items
Task(s) What to implement Why merged / kept
TASK-63
TASK-71 Structural brain + FDR lockfile engine
Implement StructuralBrainService that scans import graphs, identifies God Nodes (files imported by >5 others), and persists the result to .TestForge/structural-brain.json. Implement LockfileParser to read package-lock.json or yarn.lock for transient dependencies. Implement ImportFingerprinter to detect implicit frameworks (e.g. playwright-bdd via defineBddConfig pattern). Inject pre-flight warnings into validate_and_write when a God Node is being modified. Surface all findings in analyze_codebase output. Both run at analyze_codebase time, both write to .TestForge/ persistence. One 'codebase intelligence' service.
TASK-65 Observability service
Implement ObservabilityService that logs every tool execution as JSONL to projectRoot/mcp-logs/session-{timestamp}.jsonl. Include tool name, input args, response summary, duration, and error if any. Implement a Secret Masker that redacts environment variables, passwords, and tokens before logging. Wrap all tool dispatch in index.ts with the logger. Standalone wrapper. Enormous debugging value for agentic sessions — ships independently.
TASK-35
TASK-54
TASK-67 Token efficiency: output limits + error distiller + context compression
Implement a global CHARACTER_LIMIT (25,000 chars) for tool responses with smart truncation message. Implement ErrorDistiller to strip timestamps, non-critical driver logs, and redundant stack traces from Playwright output — return only the causal chain (Step → Selector → Root Failure). Implement ContextManager that after 3 DOM scans compresses the oldest into single-line summaries, keeping only the 2 most recent full-size. Append compressed context to generation tool headers. All three reduce context bloat. One 'context management' module with three strategies.
TASK-47
TASK-52 Session monitoring: token budget + context pulse
Implement heuristic token counter per session. Register get_token_budget tool. Append a [Session Cost: N tokens] footer to high-density tool responses (analyze_codebase, inspect_page_dom). Implement ContextPulseService that appends a state summary block to short-lived tool responses every 5 turns. Provide get_system_state tool for explicit refresh. Both are lightweight append-to-response features on the same tool dispatch layer. One AnalyticsService pass.
TASK-70 JSON-RPC pipe hardening + error DNA
Refactor Runner.ts to use stdio: ['ignore', 'pipe', 'pipe'] so child-process logs never leak into MCP stdout. Implement ErrorClassifier that parses common Playwright/shell errors into structured DNA codes: Infrastructure, Logic, Transient. Update self_heal to receive structured DNA instead of raw stack traces. Critical standalone stability fix. Easy to bisect if it causes issues — do not bundle.

Phase 3 exit criteria
[ ] analyze_codebase returns a 'Known God Nodes' list for any project
[ ] analyze_codebase correctly identifies playwright-bdd even when config is at a non-standard path
[ ] mcp-logs/ directory is created on first tool call and grows with each session
[ ] Tool response for a 100,000-char DOM is truncated with a readable message, not sent raw
[ ] Running a failing Playwright test returns a causal chain summary, not a raw log dump
[ ] JSON-RPC parse errors no longer appear in MCP client when a test produces verbose output

 
PHASE 4 — Autonomy & UX
Reduce agent turn counts, add autonomous navigation discovery, and improve self-healing intelligence.

Work items
Task(s) What to implement Why merged / kept
TASK-55
TASK-58
TASK-68 Orchestration: nano-tool consolidation + atomic workflows
Merge set_credentials and inject_app_build into manage_config({operation: 'write'}). Merge end_session into start_session({operation: 'stop'}). Implement OrchestrationService. Implement create_test_atomically(description, xml, screenshot) — one-hop tool that runs analysis, generation, and file writing in sequence. Implement heal_and_verify_atomically(error, xml) — one-hop tool that runs healer, verifier, and learner in sequence. TASK-58 and TASK-68 are the exact same deliverable written twice with identical scope. TASK-55 prepares the tool surface they sit on. One OrchestrationService PR.
TASK-45
TASK-64 Navigation graph + autonomous explorer
Implement NavigationGraphService that stores a graph of URLs (nodes) and transitions (edges). Persist to .TestForge/navigation-map.json. Implement Mermaid diagram export. Register discover_app_flow tool: takes a start URL, clicks links and buttons to discover new URLs, updates the persistent graph. Inject the known navigation graph into analyze_codebase results so the agent knows how to reach Screen B from Screen A. TASK-45 ('explorer tool') and TASK-64 ('the service behind it') are the same deliverable accidentally split.
TASK-61
TASK-41 Advanced healing: DNA tracker + auto-learning
Implement DnaTrackerService to persist element metadata (tag, ID, DOM hierarchy, visual hash) to .TestForge/locator-dna.json. Implement HeuristicMatcher using Longest Common Subsequence to find near-matches without LLM. Integrate into SelfHealingService: attempt local heuristic healing first, fall back to LLM only if local fails. Wire auto-training into the successful resolution path — mcp-learning.json is updated atomically after every successful heal. Auto-learning is the natural 'on success' callback of the DNA tracker. Ship together.
TASK-62
TASK-34 Smart DOM + prompt compression
Port noise-filtering DOM logic from page-agent into DomInspectorService. Update inspect_page_dom to return pruned 'Actionable Markdown' instead of raw HTML. Implement coordinate-based fallback for obscured element clicks. Implement prompt compression for large Gherkin files: truncate to last 3 screens context. Add Mermaid navigation graph injection into generate_cucumber_pom prompts. Both reduce token input to generation tools — one 'prompt efficiency' PR.

Phase 4 exit criteria
[ ] heal_and_verify_atomically fixes a broken selector and updates mcp-learning.json in a single tool call
[ ] Agent turn count for standard test generation is reduced by at least 2 turns
[ ] discover_app_flow on a 5-page site produces a valid Mermaid diagram
[ ] A previously passing locator that breaks due to a DOM change is healed without an LLM call (heuristic match)
[ ] inspect_page_dom response is under 5,000 tokens for a typical SPA page
[ ] set_credentials and end_session are no longer registered as standalone tools

 
PHASE 5 — Polish: DX, Docs & Evaluation
Run this phase only after all implementation tasks are DONE and passing. Do not run in parallel with Phase 3 or 4.

Work items
Task(s) What to implement Why merged / kept
TASK-69
TASK-22
TASK-72 Setup & upgrade UX
Update setup_project to use two-phase flow: Phase 1 creates mcp-config.json with CONFIGURE_ME placeholders, Phase 2 completes the scaffold after user verification. Add docs/MCP_CONFIG_REFERENCE.md and docs/PROMPT_CHEATBOOK.md scaffolding to setup output. Implement syncConfigSchema in ProjectSetupService for upgrade_project to apply new config fields without overwriting custom edits. Implement TsConfigManager: when validate_and_write creates a new top-level directory, automatically add it to tsconfig.json compilerOptions.paths. All three improve what setup_project and upgrade_project output. One ProjectSetupService PR.
TASK-46
TASK-25 Tool descriptions (Caveman Protocol) + projectExtensions
Rewrite all tool descriptions in index.ts to the format: WHEN TO USE: [trigger] | WHAT IT DOES: [effect] | HOW IT WORKS: [logic]. Add Anti-Usage notes to ambiguous tools. Implement ExtensionLoader utility that reads, parses, and formats project-specific config files (feature flags, logger config, API registries) for injection into LLM prompts. Wire ExtensionLoader into 5 services: generate, analyze, heal, run, check. Both touch index.ts descriptions — edit the file once.
TASK-27
TASK-31
TASK-26 Documentation audit + evaluation harness + test coverage gate
Install c8 in devDependencies. Update package.json test scripts to use c8 with --check-coverage. Create .c8rc.json with 90% threshold for lines/functions/statements, 80% for branches. Write baseline test files for any service with zero coverage. Audit docs/ for stale references (McpConfig fields, tool names, default paths). Create evaluation.xml with 10 read-only multi-hop QA questions that test real TestForge tool usage. All three are project hygiene tasks that only make sense after implementation is stable.

Phase 5 exit criteria
[ ] npm test passes at 90%+ coverage (lines, functions, statements) in TestForge
[ ] setup_project creates a docs/ folder with MCP_CONFIG_REFERENCE.md on first run
[ ] upgrade_project preserves user's custom config values when applying new schema fields
[ ] All tool descriptions follow the WHEN TO USE / WHAT IT DOES / HOW IT WORKS format
[ ] Every McpConfig field referenced in docs/ exists in the actual TypeScript interface
[ ] evaluation.xml contains 10 questions and the harness reports > 80% pass rate

Dropped & deferred tasks
These tasks were removed from the active plan. Do not implement them unless explicitly revisited.

Task Reason for deferral
TASK-51 Non-blocking job queue — high complexity, requires client-side polling protocol. Superseded by Phase 4 atomic tools which reduce test run time. Revisit post-Phase 4 if timeouts remain a problem.
TASK-57 Champion selector / hybrid prompt engine — requires a mature Page Object corpus to find a 'champion' from. Premature until the codebase being tested is stable. Defer to post-Phase 4.
TASK-60 Surgical patching (anchor-based line replacement) — valuable but niche. Partially covered by Phase 1 atomic staging. Add only if God Node edits become a real bottleneck post-Phase 3.
TASK-14 CI workflow safeguards — fully absorbed by Phase 1 security hardening. TASK-43 and TASK-40 add global path guards. No separate task needed.

 
Quick reference: task → phase mapping
Use this table to find which phase any original task belongs to.

Task ID Original title Consolidated into
TASK-01 Config deep merge bug Phase 1 — Config system overhaul
TASK-03 Defensive boundary / AST wrapping Phase 2 — Unified error system
TASK-04 McpConfig interface expansion Phase 1 — Config system overhaul
TASK-08 Fix scanner paths Phase 2 — Command construction
TASK-09 Sandbox security hardening Phase 1 — Security hardening sweep
TASK-12 Pure config read operations Phase 1 — Config system overhaul
TASK-14 CI workflow safeguards DROPPED — absorbed by Phase 1
TASK-15 UserStore & Git safety Phase 1 — Credential safety
TASK-20 Config-driven timeouts Phase 2 — Command construction
TASK-21 Command construction Phase 2 — Command construction
TASK-22 Incremental upgrade support Phase 5 — Setup & upgrade UX
TASK-23 SDK migration foundation Phase 2 — SDK migration
TASK-25 projectExtensions wiring Phase 5 — Tool descriptions
TASK-26 Test coverage infrastructure Phase 5 — Docs & evaluation
TASK-27 Documentation audit Phase 5 — Docs & evaluation
TASK-28 MCP SDK registerTool migration Phase 2 — SDK migration
TASK-29 Tool annotations + structuredContent Phase 2 — SDK migration
TASK-31 Evaluation harness Phase 5 — Docs & evaluation
TASK-34 Test generation prompt tuning Phase 4 — Smart DOM + prompt compression
TASK-35 Response character limit Phase 3 — Token efficiency
TASK-39 Structured tool outputs (Zod) Phase 2 — SDK migration
TASK-40 Global path security audit Phase 1 — Security hardening sweep
TASK-41 Auto-learning loop Phase 4 — Advanced healing
TASK-43 Global defensive hardening Phase 1 — Security hardening sweep
TASK-44 Atomic staging Phase 1 — Atomic staging
TASK-45 Autonomous explorer Phase 4 — Navigation graph
TASK-46 Caveman tool descriptions Phase 5 — Tool descriptions
TASK-47 Token budget monitoring Phase 3 — Session monitoring
TASK-48 Shell security (execFile) Phase 1 — Security hardening sweep
TASK-49 AST stub hunter Phase 2 — AST stub hunter
TASK-50 Unified McpError system Phase 2 — Unified error system
TASK-51 Non-blocking execution DROPPED — deferred post-Phase 4
TASK-52 Context pulse Phase 3 — Session monitoring
TASK-54 Error distiller Phase 3 — Token efficiency
TASK-55 Super-tool consolidation Phase 4 — Orchestration
TASK-57 Champion selector DROPPED — premature
TASK-58 Atomic workflow tools Phase 4 — Orchestration
TASK-60 Surgical patching DROPPED — deferred
TASK-61 Advanced self-healing (DNA) Phase 4 — Advanced healing
TASK-62 Smart DOM extraction Phase 4 — Smart DOM + prompt compression
TASK-63 Structural brain service Phase 3 — Structural brain
TASK-64 Navigation graph service Phase 4 — Navigation graph
TASK-65 Observability logs Phase 3 — Observability service
TASK-66 File state protection Phase 1 — Atomic staging
TASK-67 Context compression Phase 3 — Token efficiency
TASK-68 Orchestration super-tools Phase 4 — Orchestration
TASK-69 Setup UX & documentation Phase 5 — Setup & upgrade UX
TASK-70 JSON-RPC pipe hardening Phase 3 — JSON-RPC hardening
TASK-71 FDR lockfile engine Phase 3 — Structural brain
TASK-72 TSConfig autowiring Phase 5 — Setup & upgrade UX

End of document. 52 tasks → 18 work items → 5 phases. Build passes before every phase transition.
