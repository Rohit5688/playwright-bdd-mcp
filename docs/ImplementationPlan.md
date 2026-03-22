# Playwright-BDD MCP Implementation Plan

This document outlines the architectural enhancements and development phases of the Playwright-BDD POM MCP server, focusing on project bridging, advanced Playwright capabilities, and enterprise-grade testing patterns.

## Phase 23+ Code Review & Gap Analysis

Based on the review of the codebase (specifically changes from Phase 23 onwards), two distinct gaps/bugs have been identified.

### 1. The Custom Wrapper Package Gap
**Issue:**
While `mcp-config.json` correctly added the `basePageClass` field to allow teams to define a custom wrapper package, this configuration is not fully respected across the tools:
*   **Fallback Missing**: In `src/index.ts`, when `analyze_codebase` or `generate_gherkin_pom_test_suite` is called without a `customWrapperPackage` argument, the tool does *not* fall back to reading `config.basePageClass`.
*   **Prompt Restriction**: In `TestGenerationService.ts`, Rules 7 and 11 strictly enforce the use of Playwright's native APIs (`await this.page.click()`, `expect().toBeVisible()`). Even if a custom wrapper is passed and its methods are introspected, the prompt's strictness prevents the LLM from reliably using the custom wrapper's methods for actions/assertions.

**Proposed Solution (Implemented):**
*   Update `src/index.ts` to merge the tool argument with `config.basePageClass` before calling the analyzer/generator. ✅
*   Update `TestGenerationService.ts` to add a conditional rule: If a Custom Wrapper is detected, explicitly instruct the LLM to *prefer* the wrapper's methods for navigation, actions, and assertions over native Playwright APIs. ✅

### 2. Type Safety Bug in `user-helper.ts` Generation
**Issue:**
In both the CLI `upgrade` command (`src/index.ts:633`) and `ProjectMaintenanceService.ts` (`ensureUpToDate`), the `generateUserHelper` function is incorrectly passed `cfg.tags` instead of the actual user roles. 
*   **Result**: The generated `test-data/user-helper.ts` file ends up with `export type UserRole = '@smoke' | '@regression';` instead of `export type UserRole = 'admin' | 'standard';`.

**Proposed Solution (Implemented):**
*   Fix `ProjectMaintenanceService.ts:38` to read the actual roles from the user store (e.g., via `this.userStore.read(root, cfg.currentEnvironment)`) before regenerating the helper. ✅
*   Apply the identical fix to the CLI `upgrade` command in `src/index.ts:633`. ✅

---

## Phase 29: Advanced Playwright Capabilities (Multi-tabs & APIs) ✅ COMPLETED

**Objective**: Equip the MCP AI with rules and patterns to natively handle multi-tab interactions, network interception, and mid-test HTTP client calls, accounting for enterprise edge-cases.

**Proposed Changes**:
- **Multi-Tab Interactions**: Use `Promise.all` with `context.waitForEvent('page')`. Support `page.bringToFront()` for window switching.
- **API Interception & Capture**: 
   - For **Mocking**: Use `await this.page.route(...)` BEFORE the action.
   - For **Capturing Responses**: Use `Promise.all([this.page.waitForResponse(...), action()])` to prevent race conditions.
- **Mid-Test HTTP Requests**: Leverage the `request` fixture from `playwright-bdd`.

---

## Phase 30: API Fixtures & Authentication Architecture ✅ COMPLETED

**Objective**: Structure the project to support complex, multi-auth API testing by scaffolding a central `fixtures/` directory and explicitly teaching the AI how to parse them.

**Proposed Changes**:
1. **Scaffolding**: Update `ProjectSetupService` to automatically create a `fixtures/` directory.
2. **LLM Instructions**: Refine Rule 18 to handle `fs.readFileSync` for JSON payloads and dynamic `Authorization` header construction from `.env`.

---

## Phase 31: TypeScript DTOs & Models Architecture ✅ COMPLETED

**Objective**: Ability to natively generate and assert against strictly-typed DTOs for API payloads, replacing brittle `any` types.

**Proposed Changes**:
1. **Scaffolding**: Update `ProjectSetupService` to create a `models/` directory.
2. **LLM Instructions**: Rule 19 enforces the generation of `export interface` files for complex JSON data.

---

## Phase 32: Git Remote Setup & DTO Refinement for Interception ✅ COMPLETED

**Objective**: Establish a remote Git repository and refine DTO logic for response modification.

**Proposed Changes**:
1. **Git Initialization**: Connect local project to `https://github.com/Rohit5688/playwright-bdd-mcp.git`.
2. **DTO Refinement**: Instruct the AI to use DTOs to intercept and modify JSON bodies before fulfilling a routed request.

---

## Phase 33: Comprehensive Code Review & Quality Audit ✅ COMPLETED

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

## Phase 35: Security Hardening ✅ COMPLETED

**Objective**: Add three defensive security layers to prevent credential leakage, path traversal attacks, and command injection — without breaking any existing tool functionality.

**Changes Implemented**:
1. **Response-Level Secret Redaction** (`src/utils/SecurityUtils.ts` → `sanitizeOutput`): Masks Bearer tokens, password values, and API keys in tool responses before they reach the LLM. Applied to `analyze_codebase`, `run_playwright_test`, `self_heal_test`, and `validate_and_write`.
2. **Project Root Path Guard** (`SecurityUtils.ts` → `validateProjectPath`): Prevents `../` traversal and absolute path injection. Integrated into `FileWriterService.writeFiles()`.
3. **Directory Allow-List** (`FileWriterService.ts`): LLM-generated files can only be written to `features/`, `step-definitions/`, `pages/`, `test-data/`, `fixtures/`, `models/`. Root-level config files are managed by their dedicated tools.
4. **Shell Argument Sanitization** (`SecurityUtils.ts` → `sanitizeShellArg`): Strips dangerous metacharacters from `specificTestArgs` in `TestRunnerService`.
5. **Generated Code Secret Audit** (`SecurityUtils.ts` → `auditGeneratedCode`): Proactively scans LLM-generated files for hardcoded passwords, tokens, API keys, and credential-embedded URLs before tests run. Returns violations with fix instructions.
6. **Execution Timeout** (`TestRunnerService.ts`): Added a 2-minute per-run timeout to `execAsync` (now config-driven via `testRunTimeout`).

---

## Phase 36: Reliability & Polish (Live Repo Feedback) ✅ COMPLETED

**Objective**: Address critical feedback from live project usage to ensure enterprise-grade reliability, better onboarding, and seamless integration with existing codebases.

### 📝 36.1: Onboarding & Discovery (Items 1, 2, 4, 9)
- [x] **36.1.1: First Contact Prompts**: Create `docs/Onboarding.md` with precise user initialization sequences.
- [x] **36.1.2: Config Questionnaire**: Implement decision matrix and examples in onboarding guide.
- [x] **36.1.3: Project Root Persistence**: Add `projectRoot` to `McpConfig` and automate its detection.
- [x] **36.1.4: NPM Script Discovery**: Analyzer must scan `package.json` for existing test execution scripts.

### 🏺 36.2: Smart Resource Management (Items 3, 5, 6)
- [x] **36.2.1: Env File Reuse**: Scaffolder must check for existing `.env` files and map keys to `mcp-config.json` instead of creating new ones.
- [x] **36.2.2: Broad Test Data Discovery (Precision Refined)**:
    - [x] **36.2.2.1: Multi-Folder Recursive Scan**: Update `CodebaseAnalyzerService` to recursive scan `payloads`, `fixtures`, `data`, `mocks`, and `test-data` for `.json`, `.ts`, and `.js` data structures.
    - [x] **36.2.2.2: Sampling & Pattern Recognition**: The analyzer should provide the top-level keys/structure of discovered data files to help the AI understand its usage.
    - [x] **36.2.2.3: Configurable Data Paths**: Add `additionalDataPaths: string[]` to `McpConfig` to support non-standard legacy repo layouts.
    - [x] **36.2.2.4: Reuse-Only Rule**: Enforce **Rule 26** to strictly mandate the use of discovered data structures over generating new mock data.
- [x] **36.2.3: Config Reuse**: Detect existing `playwright.config.ts` and respect its presence during initialization.

### 🛡️ 36.3: Reliability & Stability (Items 7, 8, 12, 13)
- [x] **36.3.1: Step-Level Context**: Enforce **Rule 20** for mandatory fixture destructuring in all step definitions for state isolation.
- [x] **36.3.2: Spec File Guard**: Enforce **Rule 21** to strictly forbid the tool from writing to `.spec.ts` files.
- [x] **36.3.3: Navigation Stability**: Inject `waitForStable()` into `BasePage.ts` and enforce its use during tab switching/navigation (Rule 22).
- [x] **36.3.4: Ad/Popup Handling**: Scaffolld `closePopups()` in `BasePage.ts` and add interception logic to the self-healer.

### 🧠 36.4: Self-Healing & Prompt Intelligence (Items 10, 11, 14, 15)
- [x] **36.4.1: Architecture Notes**: Automatically generate `mcp-architecture-notes.md` when custom wrappers are detected (Item 11).
- [x] **36.4.2: Self-Healing v2**: Implement `AD_INTERCEPTED_FAILURE` classification and auto-healing strategies (Item 10).
- [x] **36.4.3: Smart Feature Merging**: Implement **Rule 24** to intelligent append scenarios to existing feature files.
- [x] **36.4.4: POM Enforcement for Wrappers**: Enforce **Rule 25** to ensure wrapper calls are encapsulated in Page Object methods, preventing "direct to wrapper" generation.

### 🔍 Phase 36 Review & Validation Steps
1. **Analyze Tool**: Run `analyze_codebase` on an existing project. Verify it detects `.env`, `playwright.config`, and `package.json` scripts. Check `existingTestData` shows your fixtures.
2. **Onboarding**: Review `docs/Onboarding.md`. Copy-paste the "First Contact" prompt into a new AI session and verify it follows the upgrade path correctly.
3. **Architecture Notes**: After analysis, check `docs/mcp-architecture-notes.md`. Verify it summarizes your custom wrapper methods.
4. **Self-Healing**: Trigger a "click intercepted" error (by having an overlay on the page). Run `self_heal_test` and verify it identifies `AD_INTERCEPTED_FAILURE` and suggests `includeIframes: true`.
5. **BasePage**: Run `setup_project` in a blank dir. Verify `pages/BasePage.ts` contains `waitForStable` and `closePopups`.

### 🛡️ Phase 36 Technical Review Checklist (File-by-File)
Review these specific changes to ensure the logic matches your team's expectations:

1.  **36.1: Onboarding & Discovery**:
    *   `src/interfaces/ICodebaseAnalyzer.ts`: Verify `npmScripts` and `projectRoot` fields.
    *   `src/services/McpConfigService.ts`: Check `DEFAULT_CONFIG` for `architectureNotesPath`.
    *   `docs/Onboarding.md`: Review the "First Contact" prompt logic.
2.  **36.2: Smart Resource Management**:
    *   `src/interfaces/ICodebaseAnalyzer.ts`: Verify `sampledStructure?` added to test data.
    *   `src/services/CodebaseAnalyzerService.ts`: Examine recursive `readAllFiles` call for multiple directories and `extractSampleStructure` logic.
    *   `src/services/McpConfigService.ts`: Check `additionalDataPaths: string[]` addition.
    *   `src/services/ProjectMaintenanceService.ts`: Ensure `.env` and `playwright.config` reuse logic is solid.
3.  **36.3: Reliability & Stability**:
    *   `src/services/TestGenerationService.ts`: Review rules **20, 21, and 22**.
    *   `src/services/ProjectSetupService.ts`: Review `BasePage.ts` for `waitForStable` and `closePopups`.
5.  **Phase 42: Accessibility Testing**:
    *   `src/services/McpConfigService.ts`: Verify `a11yStandards` and `a11yReportPath` defaults.
    *   `src/services/ProjectSetupService.ts`: Check `@axe-core/playwright` in `npm install` and the dynamic `checkAccessibility` logic in `BasePage.ts`.
    *   `src/services/TestGenerationService.ts`: Review **Rule 27** for a11y auto-triggering.

---

## Phase 37: Resilience & Observability ✅ COMPLETED

**Objective**: Address long-term reliability, observability, and documentation enhancements based on recent recommendations.

**To-Do Items**:
1.  **Security Smoke Tests**: Implement automated tests to verify path guards, shell sanitization, and response redaction.
2.  **Enhanced Codebase Analysis**: Add detection for duplicate step patterns, unused POM methods, and wrapper usage metrics.
3.  **Dry Run / Preview Mode**: Add `dryRun: true` parameter to writing tools to return proposed changes without modifying disk.
4.  **Expanded Documentation**:
    - `docs/Security.md`: Detailed security architecture.
    - `docs/McpConfig.md`: Full schema documentation.
    - `docs/Workflows.md`: Example LLM conversation flows.
    - Updated `DockerSetup.md` for remote SSE/HTTP modes.

---

## 🚀 The Migration & Enterprise Era (Phases 38-43)

> [!IMPORTANT]
> **Mandatory Prerequisite**: For every phase below, a "Logical Design Analysis" (LDA) must be performed and approved before any code changes. The LDA must evaluate architectural impact, backward compatibility, and credit efficiency.

### Phase 38: Selenium → Playwright Migration Engine ✅ COMPLETED
**Priority**: ★★★★★ (High Impact / ROI)
**Objective**: Build `migrate_from_selenium` tool to automate legacy suite modernization.

#### 🧠 Complexity & Challenges
*   **AST Parsing (High)**: Navigating legacy code structure requires robust syntax tree analysis (using `ts-morph` or `tree-sitter`) to identify Page Objects and Step Definitions.
*   **Sync to Async (Medium)**: Most Selenium (Java/Python/JS) logic is synchronous. The migration must correctly inject `await` and handle Promise flows in Playwright.
*   **Locator Mapping (Medium)**: `By.id`, `By.xpath`, and `By.cssSelector` must be translated to `page.locator()` or user-facing `GetByRole` equivalents.
*   **Wait Strategies (Low)**: Mapping `WebDriverWait` / `ExpectedConditions` to Playwright's auto-waiting logic and `waitForSelector`.
*   **Folder Structure (Low)**: Handling legacy `src/test/java` or `tests/selenium` directories and mapping them to the MCP-standard `features/`, `pages/`, and `step-definitions/`.

#### 📋 Task Breakdown
1.  **38.1: Research & Logical Design Analysis (LDA)**:
    *   38.1.1: Identify target Selenium dialects (prioritizing TS/JS/Java).
    *   38.1.2: Research Hybrid Parsers (mixing `tree-sitter` for Java/Python and `ts-morph` for JS/TS) vs LLM AST prompting.
    *   38.1.3: Define command & locator mapping dictionary.
2.  **38.2: Core POM Migration Engine**:
    *   38.2.1: Implement AST-based converter for Page Classes (Constructor refactoring, `page` injection).
    *   38.2.2: Implement Method Logic Converter (Command mapping: `sendKeys` → `fill`, `click` → `click`).
    *   38.2.3: **Control Flow Reordering**: Convert sequential `driver.switchTo().window()` to Promise-wrapped `waitForEvent('page')`.
    *   38.2.4: **IFrame State Translation**: Convert stateful `switchTo().frame()` blocks to stateless chained `frameLocator()`.
    *   38.2.5: **Wait Strategy Cleanup**: Strip `Thread.sleep` and `WebDriverWait`, delegating to Playwright auto-waiting.
3.  **38.3: BDD Step Definition Migration**:
    *   38.3.1: Map legacy Cucumber step definitions to `playwright-bdd` decorators.
    *   38.3.2: Refactor step logic to call the newly migrated Page Objects.
#### 🧠 Advanced Migration Intelligence
*   **Framework Discovery**: Scan `package.json`/`pom.xml`/`requirements.txt` to identify Selenium wrappers (e.g. Serenity, Selenide, Protractor). Map their specialized commands (e.g. `Given I open...` in Serenity) to MCP equivalents.
*   **Legacy Wrapper Omission**: Detect massive `BaseTest` or `TestBase` (driver init/teardown) logic and safely strip it, diverting configuration to Playwright's native `playwright.config.ts` and context fixtures.
*   **Style Learning (AI-Driven)**: Utilize `analyze_codebase` to fingerprint existing Test/Page structures (e.g. CamelCase vs snake_case, Class per Page vs Component) and ensure migrated code matches the project's native style.
*   **Duplication Prevention**:
    *   **AST Fingerprinting**: Before migrating a legacy POM, compare its selectors and logic against existing Playwright POMs. 
    *   **Smart Merging**: If a partial match is found, "enhance" the existing POM with missing locators instead of creating a duplicate file.
*   **State Migration**: Detect legacy global driver state (static variables, cookies) and map it to Playwright's `storageState` API for isolated contexts.

#### 🌐 Non-UI & External Service Migration
*   **API Interception**: Map legacy REST calls (e.g. `RestAssured`) to Playwright's `request` object. Prioritize mapping to existing project-specific API utilities.
*   **Data Provider Migration**: Convert Java `@DataProvider` or Python `@pytest.mark.parametrize` to Playwright `test.describe` loops, migrating static CSVs/Excel to JSON if necessary.
*   **Database Mapping**: Map legacy `DbUtils` to Playwright service objects. Transition SQL query patterns to `async/await` and map connection properties to `.env`.
*   **Cloud Services (AWS/Azure/GCP)**: 
    *   Map legacy SDK calls (e.g. `aws-sdk`) to Playwright **Global Setup** or **Context Fixtures**.
    *   Ensure cloud credentials/regions are mapped to the Playwright environment store.
*   **Custom Service Scaffolding**: Automatically scaffold `services/` folder for any legacy utility class that handles cross-cutting concerns (e.g. `FileWatcher`, `KafkaListener`).
#### 📊 Phase 38.7: Legacy Reporting Discovery & Awareness
*   **Reporting Discovery**: Analyze the legacy framework for custom reporters (e.g. Allure, Extent, or internal JSON dashboards).
*   **Auto-Bridging**: 
    - Map legacy log statements (e.g. `Log.info`) to Playwright `test.step` for granular breadcrumbs.
    - Scaffold a bridge `Reporter` that forwards Playwright events to the legacy reporting infrastructure.
*   **Design-Time Awareness**: Instruct the AI (Rule 28) to automatically utilize detected custom reporting utilities in all NEWLY generated tests for consistency.
- **LDA Requirements**: API authentication strategy for Jira/Xray (Cloud vs Server), Cucumber JSON mapping, and result reporting logic.
- **Key Features**: `fetch_jira_requirements`, `push_tests_to_xray`, `report_execution_to_xray`.

#### 🏗️ Phase 38.8: Structural Pattern & Runner Bridging
Legacy implementations vary dramatically in design architecture. The migration engine must heuristically detect and map these distinct patterns:

*   **Standalone/Procedural Scripts**: 
    If a legacy test lacks Page Objects (fat scripts), the migration engine will optionally perform **Procedural Deconstruction**. It automatically extracts raw locators into a newly generated `MigrationPage.ts` POM, injecting those calls into the refactored test to enforce modern POM architecture.
*   **Singleton / DriverManagers**: 
    Legacy code heavily relying on `ThreadLocal<WebDriver>` or `DriverFactory.getInstance()` Singletons will be detected. The engine strips these instantiations entirely, remapping all `driver` references to the native Playwright `{ page, context }` fixtures injected at the test signature.
*   **Vanilla JUnit / TestNG (Non-Cucumber)**: 
    If a legacy suite uses raw `@Test` annotations without Gherkin `.feature` files, the engine performs an **Inferred BDD Upgrade**. It analyzes the test method names, logic blocks, and assertions to auto-generate the missing `.feature` file (e.g., `Given/When/Then`) and maps the legacy code into modern `playwright-bdd` step definitions.

### Phase 40: Maintenance & Developer Experience ✅ COMPLETED
**Priority**: ★★★★☆
**Objective**: Keep the migrated codebase clean and data-driven.
- **Key Features**: 
  - **Auto-Refactoring**: `suggest_refactorings` to merge duplicate steps/POM methods.
  - **Data Factories**: `generate_fixture` using faker-js for typed test data.
  - **Visual Regression**: Basic `toHaveScreenshot` integration and rebaselining tool.

### Phase 41: Advanced Analytics & Optimization ✅ COMPLETED
**Priority**: ★★★★☆
**Objective**: Maximize efficiency and debugging speed.
- **Key Features**:
  - **Coverage-Guided Gen**: Generate tests based on gaps in LCOV reports.
  - **One-Click Explanation**: `explain_failure` tool providing natural language RCA + fix suggestions.

### Phase 42: Automated Accessibility (a11y) Testing ✅ COMPLETED

### Phase 43: Environment Isolation & Setup Verification ✅ COMPLETED
**Priority**: ★★★★★ (Critical for Reliability)
**Objective**: Prevent common setup issues like "Playwright Test did not expect test.describe() to be called here" and configuration pitfalls.
- **LDA Requirements**: Define a "Sanity Check" logic for `analyze_codebase` and `ProjectSetupService`.
- **Key Features**:
  - **Duplicate Installation Guard**: `analyze_codebase` must scan parent directories for conflicting `node_modules` or `package.json` files that could cause double-loading of Playwright modules (the "describe" error).
  - **Config Path Standardization**: 
    - Enforce `featuresRoot: 'features'` instead of glob patterns like `./features/*.feature` to prevent Playwright from accidentally scanning the generated `.features-gen` folder.
    - Ensure `testDir` is correctly isolated to `.features-gen`.
  - **Direct Execution Guidance**: The generator should explicitly provide the correct terminal commands (`npx bddgen && npx playwright test`) to ensure tests are run within the correct project context.
  ### Phase 45: Interactive Clarification & User Feedback Loop ✅ COMPLETED
**Priority**: ★★★★★ (Critical for Accuracy)
**Objective**: Enable the MCP to pause and request user input when encountering ambiguity or low-confidence scenarios.
- **LDA Requirements**: Define a "Clarification Protocol" for tool-triggered questions, UI/Response mapping for the host client (e.g. Cursor/Claude), and state preservation during waits.
- **Key Features**: 
  - **`request_user_clarification` Tool**: A dedicated MCP tool that presents multiple options or questions to the human user.
  - **Onboarding Wizard**: A step-by-step setup flow that pauses after `analyze_codebase` to ask about `authStrategy`, `waitStrategy`, and `tags` before updating any files.
  - **Environment Conflict Resolution**: Explicitly asking "I found an existing .env.dev and .env.local. Which one should I map to the 'local' environment in mcp-config?".
  - **Ambiguity Gates**: Strategic pauses in `migrate_from_selenium` when multiple valid architectural choices (e.g. two conflicting base pages) are found.
  - **Pre-Scaffold Approval**: Presenting the "proposed configuration" to the user for final approval before `ProjectSetupService` writes it to disk.

### Phase 46: Autonomous Learning & Persistent Knowledge Base ✅ COMPLETED
**Priority**: ★★★★★ (Strategic Efficiency)
**Objective**: Build and refine a project-specific knowledge base to improve future accuracy and respect team-level coding styles.
- **LDA Requirements**: Define the `knowledge/` / `mcp-learning.json` storage format, extraction heuristics (frequency thresholds), and human-in-the-loop validation hooks.
- **Key Features**: 
  - **`train_on_example` Tool**: Allows users to point to "Gold Standard" code/patterns for the MCP to learn and prioritize in future generations.
  - **`// @mcp-learn` Directive**: Inline code comments that trigger the analyzer to "fingerprint" a specific pattern (e.g. a complex DB query wrap) for reuse.
  - **Correction Analytics**: After a manual fix during self-healing, the tool asks "Should I learn this fix pattern?" to prevent the same error in future tests.
  - **Scripting Error Correction Loop**: Specifically targets failures in the self-healing process caused by "Bad AI Scripting" (e.g. wrong locator, missing `await`, or incorrect POM use). By comparing the original AI-generated script with the User's final fix, the MCP updates its "Avoid Patterns" rules for future generations.
  - **Auto-Update Architecture Notes**: Periodically running a "deep scan" to summarize new helper functions or wrappers added by the user.
#### 🌍 38.8: Multi-Language Bridge (Java/Python)
*   **Source Transpilation**: Map Selenium Patterns from Java/Python to TypeScript using AI-guided code transformation.
*   **Library Mapping**: Map `RestAssured` (Java) or `Pytest` (Python) to Playwright equivalents.
#### 🛡️ 38.9: Shadow DOM & Piercing Locators
*   **Piercing Strategy**: Automated conversion of Selenium's `executeScript` shadow-piercing hacks to Playwright's native `>>` or `locator().first()` syntax.

### Phase 47: CI/CD Intelligence & Pipeline Auto-Generation ✅ COMPLETED
**Priority**: ★★★★★ (Critical for Automation)
**Objective**: Automate the creation of production-ready CI/CD pipelines.
- **LDA Requirements**: Define YAML templates for GitHub Actions, Jenkins, and GitLab CI.
- **Key Features**: 
  - **Pipeline Scaffolding**: `generate_ci_pipeline` tool to create fully configured `.github/workflows` or `Jenkinsfile`.
  - **Cloud Grid Integration**: Auto-configuration for Playwright Cloud, BrowserStack, or SauceLabs within the pipeline.

### Phase 48: Evidence Enrichment & Collaborative Knowledge ✅ COMPLETED
**Priority**: ★★★★☆
**Objective**: Shared team-level intelligence and rich reporting.
- **Features**:
  - **Jira Evidence Sync**: Auto-attach Playwright Videos and Traces (zip) to Jira/Xray issues on failure.
  - **Shared Knowledge Repo**: Implement a `knowledge/` directory in Git where the MCP stores team-trained patterns for all developers to share.

---

## Phase 49: Live Browser Sessions & Proactive Verification ✅ COMPLETED
**Priority**: ★★★★★ (Critical for Daily AI Usability)
**Objective**: Bridge the gap between static code generation and interactive, multi-step AI co-piloting by keeping browser state alive across tool calls.

- **49.1: Persistent Browser Session Manager** (`PlaywrightSessionService`)
  - Create tools: `start_session`, `end_session`, `navigate_session`.
  - Maintains a persistent Playwright browser context in the background.
  - Allows the AI to navigate to a page, inspect it, generate a step, click a button, and inspect the *next* page all in a single conversation context without launching a new browser every time.
- **49.2: Proactive Selector Verification** (`verify_selector`)
  - Create a lightweight tool to verify if a generated locator (e.g. `page.getByRole('button', { name: 'Submit' })`) resolves to a visible and enabled element *before* writing it to disk. 
  - Substantially reduces the need for post-execution self-healing by catching bad selectors at generation time.

---

## Phase 50: Exposing Existing Enterprise Polish Tools ✅ COMPLETED
**Priority**: ★★★☆☆ (Medium - High Polish)
**Objective**: The project currently contains unimplemented or unregistered enterprise services (`RefactoringService`, `AnalyticsService`, `SeleniumMigrationService`, `FixtureDataService`). These must be wired up to `index.ts` and formally documented.

- **50.1: Feature Registration & UI Bridge**
  - **Coverage Analysis**: Register `analyze_coverage` (via `AnalyticsService` / `SuiteSummaryService`) to pinpoint missing scenarios and generate test heatmaps.
  - **Refactoring Suggestions**: Register `suggest_refactorings` (via `RefactoringService`) to detect unused POM methods, duplicate step logic, and suggest cleanups.
  - **Test Migration**: Register `migrate_test` (via `SeleniumMigrationService`) to convert Cypress/Selenium legacy tests.
  - **Test Data Factories**: Register `generate_test_data_factory` (via `FixtureDataService`) to output type-safe faker.js models.
  - **Bug Export**: Register `export_bug_report` to format failure data into Jira/Linear ready markdown tickets.
