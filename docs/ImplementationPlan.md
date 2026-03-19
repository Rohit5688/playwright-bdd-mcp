# Playwright-BDD MCP Implementation Plan

This document outlines the architectural enhancements and development phases of the Playwright-BDD POM MCP server, focusing on project bridging, advanced Playwright capabilities, and enterprise-grade testing patterns.

## Phase 23+ Code Review & Gap Analysis

Based on the review of the codebase (specifically changes from Phase 23 onwards), two distinct gaps/bugs have been identified.

### 1. The Custom Wrapper Package Gap
**Issue:**
While `mcp-config.json` correctly added the `basePageClass` field to allow teams to define a custom wrapper package, this configuration is not fully respected across the tools:
*   **Fallback Missing**: In `src/index.ts`, when `analyze_codebase` or `generate_gherkin_pom_test_suite` is called without a `customWrapperPackage` argument, the tool does *not* fall back to reading `config.basePageClass`.
*   **Prompt Restriction**: In `TestGenerationService.ts`, Rules 7 and 11 strictly enforce the use of Playwright's native APIs (`await this.page.click()`, `expect().toBeVisible()`). Even if a custom wrapper is passed and its methods are introspected, the prompt's strictness prevents the LLM from reliably using the custom wrapper's methods for actions/assertions.

**Proposed Solution:**
*   Update `src/index.ts` to merge the tool argument with `config.basePageClass` before calling the analyzer/generator.
*   Update `TestGenerationService.ts` to add a conditional rule: If a Custom Wrapper is detected, explicitly instruct the LLM to *prefer* the wrapper's methods for navigation, actions, and assertions over native Playwright APIs.

### 2. Type Safety Bug in `user-helper.ts` Generation
**Issue:**
In both the CLI `upgrade` command (`src/index.ts:633`) and `ProjectMaintenanceService.ts` (`ensureUpToDate`), the `generateUserHelper` function is incorrectly passed `cfg.tags` instead of the actual user roles. 
*   **Result**: The generated `test-data/user-helper.ts` file ends up with `export type UserRole = '@smoke' | '@regression';` instead of `export type UserRole = 'admin' | 'standard';`.

**Proposed Solution:**
*   Fix `ProjectMaintenanceService.ts:38` to read the actual roles from the user store (e.g., via `this.userStore.read(root, cfg.currentEnvironment)`) before regenerating the helper.
*   Apply the identical fix to the CLI `upgrade` command in `src/index.ts:633`.

---

## Phase 29: Advanced Playwright Capabilities (Multi-tabs & APIs)

**Objective**: Equip the MCP AI with rules and patterns to natively handle multi-tab interactions, network interception, and mid-test HTTP client calls, accounting for enterprise edge-cases.

**Proposed Changes**:
- **Multi-Tab Interactions**: Use `Promise.all` with `context.waitForEvent('page')`. Support `page.bringToFront()` for window switching.
- **API Interception & Capture**: 
   - For **Mocking**: Use `await this.page.route(...)` BEFORE the action.
   - For **Capturing Responses**: Use `Promise.all([this.page.waitForResponse(...), action()])` to prevent race conditions.
- **Mid-Test HTTP Requests**: Leverage the `request` fixture from `playwright-bdd`.

---

## Phase 30: API Fixtures & Authentication Architecture

**Objective**: Structure the project to support complex, multi-auth API testing by scaffolding a central `fixtures/` directory and explicitly teaching the AI how to parse them.

**Proposed Changes**:
1. **Scaffolding**: Update `ProjectSetupService` to automatically create a `fixtures/` directory.
2. **LLM Instructions**: Refine Rule 18 to handle `fs.readFileSync` for JSON payloads and dynamic `Authorization` header construction from `.env`.

---

## Phase 31: TypeScript DTOs & Models Architecture

**Objective**: Ability to natively generate and assert against strictly-typed DTOs for API payloads, replacing brittle `any` types.

**Proposed Changes**:
1. **Scaffolding**: Update `ProjectSetupService` to create a `models/` directory.
2. **LLM Instructions**: Rule 19 enforces the generation of `export interface` files for complex JSON data.

---

## Phase 32: Git Remote Setup & DTO Refinement for Interception

**Objective**: Establish a remote Git repository and refine DTO logic for response modification.

**Proposed Changes**:
1. **Git Initialization**: Connect local project to `https://github.com/Rohit5688/playwright-bdd-mcp.git`.
2. **DTO Refinement**: Instruct the AI to use DTOs to intercept and modify JSON bodies before fulfilling a routed request.

---

## Phase 33: Comprehensive Code Review & Quality Audit

**Objective**: Audit the entire MCP server codebase to identify bugs, architectural gaps, and ensure adherence to best practices.

**Proposed Changes**:
1. **Security Audit**: Path sanitization and Zod validation review.
2. **Error Handling**: Consistent try-catch and descriptive error returns.
3. **Consistency Check**: Interface vs. Service implementation alignment.
4. **Tool Metadata**: Review descriptions and schemas for LLM context.
5. **Node.js Standards**: JSDoc, modularity, and naming convention review.

### Findings & Fixes Applied
- **Critical**: Phase 33 switch-refactor accidentally stubbed `manage_config`, `manage_users`, `manage_env`, and `setup_project` handlers — restored full logic.
- **Moderate**: `CodebaseAnalysisResult.mcpConfig` interface was incomplete — expanded with `backgroundBlockThreshold`, `waitStrategy`, `authStrategy`.
- **Moderate**: Residual `any` casts in `TestGenerationService.ts` — removed by using the expanded interface.
- **Moderate**: `lastAnalysisResult` typed as `any` — changed to `CodebaseAnalysisResult | null`.
- **Minor**: `users.example.json` contained invalid JSON (JS comments) — fixed to use valid JSON with `_README` key.
- **Minor**: `README.md` import path missing `.js` extension for ESM — fixed.

---

## Phase 34: VS Code Extension Integration

**Objective**: Build a companion VS Code extension that provides a rich, AI-native UI for the MCP server, enabling seamless test generation, execution, and debugging directly from the IDE.

**Proposed Changes**:
1. **AI Assistant UI**: Implement a sidebar view with a chat-like interface for interacting with the MCP server.
2. **Project Analysis**: Automatic background analysis of the Workspace using the `analyze_codebase` tool.
3. **Smart Generation**: Context-aware Gherkin and POM generation with one-click "Apply" to the filesystem.
4. **Live Execution**: Integration with the VS Code Test Controller for running BDD tests and visualizing results.
5. **Self-Healing UI**: Interactive prompts for fixing failing tests via the `self_heal_test` logic.

---

## Phase 35: Security Hardening

**Objective**: Add three defensive security layers to prevent credential leakage, path traversal attacks, and command injection — without breaking any existing tool functionality.

**Changes Implemented**:
1. **Response-Level Secret Redaction** (`src/utils/SecurityUtils.ts` → `sanitizeOutput`): Masks Bearer tokens, password values, and API keys in tool responses before they reach the LLM. Applied to `analyze_codebase`, `run_playwright_test`, `self_heal_test`, and `validate_and_write`.
2. **Project Root Path Guard** (`SecurityUtils.ts` → `validateProjectPath`): Prevents `../` traversal and absolute path injection. Integrated into `FileWriterService.writeFiles()`.
3. **Directory Allow-List** (`FileWriterService.ts`): LLM-generated files can only be written to `features/`, `step-definitions/`, `pages/`, `test-data/`, `fixtures/`, `models/`. Root-level config files are managed by their dedicated tools.
4. **Shell Argument Sanitization** (`SecurityUtils.ts` → `sanitizeShellArg`): Strips dangerous metacharacters from `specificTestArgs` in `TestRunnerService`.
5. **Generated Code Secret Audit** (`SecurityUtils.ts` → `auditGeneratedCode`): Proactively scans LLM-generated files for hardcoded passwords, tokens, API keys, and credential-embedded URLs before tests run. Returns violations with fix instructions.
6. **Execution Timeout** (`TestRunnerService.ts`): Added a 2-minute per-run timeout to `execAsync` (now config-driven via `testRunTimeout`).

---

## Phase 36: Future Improvements (Backlog)

**Objective**: Address long-term reliability, observability, and documentation enhancements based on recent recommendations.

**To-Do Items**:
1. **Security Smoke Tests**: Implement automated tests to verify path guards, shell sanitization, and response redaction.
2. **Enhanced Codebase Analysis**: Add detection for duplicate step patterns, unused POM methods, and wrapper usage metrics.
3. **Dry Run / Preview Mode**: Add `dryRun: true` parameter to writing tools to return proposed changes without modifying disk.
4. **Expanded Documentation**:
    - `docs/Security.md`: Detailed security architecture.
    - `docs/McpConfig.md`: Full schema documentation.
    - `docs/Workflows.md`: Example LLM conversation flows.
    - Updated `DockerSetup.md` for remote SSE/HTTP modes.

---

## 🚀 The Migration & Enterprise Era (Phases 37-40)

> [!IMPORTANT]
> **Mandatory Prerequisite**: For every phase below, a "Logical Design Analysis" (LDA) must be performed and approved before any code changes. The LDA must evaluate architectural impact, backward compatibility, and credit efficiency.

### Phase 37: Selenium → Playwright Migration Engine
**Priority**: ★★★★★ (High Impact / ROI)
**Objective**: Build `migrate_from_selenium` tool to automate legacy suite modernization.
- **LDA Requirements**: Define AST parsing strategy (ts-morph/tree-sitter), locator mapping rules, and AWS/API fixture wrapping logic.
- **Key Features**: Phased migration (--dry-run, --pages-only), smart locator translation, and migration reporting.

### Phase 38: Jira + Xray Enterprise Integration
**Priority**: ★★★★★ (Critical Traceability)
**Objective**: End-to-end requirement-to-execution traceability.
- **LDA Requirements**: API authentication strategy for Jira/Xray (Cloud vs Server), Cucumber JSON mapping, and result reporting logic.
- **Key Features**: `fetch_jira_requirements`, `push_tests_to_xray`, `report_execution_to_xray`.

### Phase 39: Maintenance & Developer Experience
**Priority**: ★★★★☆
**Objective**: Keep the migrated codebase clean and data-driven.
- **Key Features**: 
  - **Auto-Refactoring**: `suggest_refactorings` to merge duplicate steps/POM methods.
  - **Data Factories**: `generate_fixture` using faker-js for typed test data.
  - **Visual Regression**: Basic `toHaveScreenshot` integration and rebaselining tool.

### Phase 40: Advanced Analytics & Optimization
**Priority**: ★★★★☆
**Objective**: Maximize efficiency and debugging speed.
- **Key Features**:
  - **Coverage-Guided Gen**: Generate tests based on gaps in LCOV reports.
  - **One-Click Explanation**: `explain_failure` tool providing natural language RCA + fix suggestions.

### Phase 41: Automated Accessibility (a11y) Testing
**Priority**: ★★★★☆ (Standard Compliance)
**Objective**: Build accessibility scanning into the core BDD workflow with configurable standards.
- **LDA Requirements**: Axe integration strategy (using `@axe-core/playwright`), and mapping `mcp-config.json` standard selections to the axe-core engine.
- **Key Features**: 
  - **Config-Driven Standards**: Define target compliance (e.g., `["wcag2aa", "wcag21aa"]`) in `mcp-config.json`.
  - `checkAccessibility()` step definition that respects the configured standards.
  - Automated a11y failure reporting and HTML report generation.
  - Basic a11y score per-page in the analysis report.
