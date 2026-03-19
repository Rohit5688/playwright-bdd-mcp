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
