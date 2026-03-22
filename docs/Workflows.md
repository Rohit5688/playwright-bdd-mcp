# MCP AI Conversation Workflows

This document outlines the standard operational workflows when conversing with an AI powered by the Playwright-BDD POM MCP server.

### 1. New Project Setup Workflow
**User:**
> "I want to start a new test project in the `automation/` directory."

**AI Engine:**
1. Calls `setup_project(projectRoot: 'automation/')`.
2. Asks the User to edit `mcp-config.json` or `.env` and fill in API URLs.
3. Calls `manage_env("scaffold")` and `manage_users("scaffold")`.

### 2. Feature Generation & Self-Healing Workflow
**User:**
> "Write a test that logs into the system, navigates to the dashboard, and asserts the welcome banner is visible."

**AI Engine:**
1. Calls `analyze_codebase(projectRoot: '.')` to find the login Wrapper API and POM definitions.
2. Calls `generate_gherkin_pom_test_suite({...})` to construct the prompt syntax.
3. Calls `validate_and_write(dryRun: false)` to write the `login.feature`, `login.steps.ts`, and `LoginPage.ts` to disk.
4. The `validate_and_write` tool will automatically run the tests locally.
5. If the test fails due to a locator issue, `validate_and_write` will internally catch the failure, analyze the output, and run `inspect_page_dom` to find the *correct* CSS selector in the live DOM. It will return exactly how the AI should rewrite the Page Object to fix the test.

### 3. Dry Run / Preview Workflow
**User:**
> "Can you draft a test for the shopping cart page, but don't write anything to disk yet so I can review it?"

**AI Engine:**
1. Calls `analyze_codebase(projectRoot: '.')`.
2. Calls `validate_and_write(dryRun: true)`. The MCP server audits the generated code for secrets and path traversal attempts, and returns a safe "Preview" stating the files would compile.
3. AI asks the user for final approval before calling `validate_and_write(dryRun: false)`.
