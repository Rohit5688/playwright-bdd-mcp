# Execution & Self-Healing

The MCP does not just write code; it runs it, analyzes the console output, and heals broken DOM selectors automatically using the live browser.

## `run_playwright_test`
Fires a Node subprocess to execute `npx bddgen` and `npx playwright test`. The tool sanitizes the CLI output (hiding secrets) and returns the test suite result.

**Example Prompt to AI:**
> *"Run the playwright tests. Only run the `@smoke` tags."*

## `self_heal_test`
When a test fails because a selector breaks (e.g., a developer changed `#submit-btn` to `.btn-primary`), this tool acts as an automated triage.
- **Classification**: Analyzes `stderr` to determine if the failure is a SCRIPTING issue (Locators) or an APP BUG (Assertion mismatch).
- **DOM Scraping**: If it is a locator timeout, the tool leverages `inspect_page_dom` to re-navigate to the failing URL in a headless browser.
- **Healing**: It compares the Accessibility Object Model (AOM) against the failing code, providing the LLM with the *exact* new selector required to fix the Page Object.

**Example Prompt to AI:**
> *"My login test just failed. Use the self-healing tool to scrape the live DOM and figure out the correct locator for the password field."*

## `inspect_page_dom`
Navigates to a target URL in a Chromium instance and dumps a simplified semantic Accessibility Tree (DOM AOM). Use this strictly BEFORE writing new Page Objects to ensure 100% selector accuracy, or during debugging.

**Example Prompt to AI:**
> *"Inspect the page DOM at `http://localhost:3000/dashboard`. Can you find the precise selector for the user avatar in the top right corner?"*

## `generate_rca_prompt`
(Root Cause Analysis). For failures that are NOT locator issues (like network routing problems or backend 500s), this tool formats a comprehensive debug prompt analyzing the stack trace.

**Example Prompt to AI:**
> *"This API mocking test is failing due to a Cross-Origin error. Generate an RCA prompt to help us debug the server network topology."*
