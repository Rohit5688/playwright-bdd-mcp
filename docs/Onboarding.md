# 🚀 MCP Onboarding & Configuration Guide

This guide provides the essential "First Contact" prompts and a configuration questionnaire to ensure the MCP tool is perfectly aligned with your project's unique architecture.

---

## 1. The "First Contact" Prompts

When you connect this MCP to your AI assistant (e.g., Claude Desktop, Cursor), use these prompts sequentially to establish a solid foundation.

### Step 1: Smart Discovery
> "I want to integrate this MCP with my existing project. Run `analyze_codebase` on `/your/project/path` to discover my existing Page Objects, step definitions, and environment configurations. If you find any existing `.env` or `playwright.config.ts` files, tell me how we can reuse them instead of creating new ones."

### Step 2: Adaptive Upgrading
> "Based on your analysis, run `upgrade_project` to ensure my directory structure supports the latest MCP standards (like the `test-data/` user store and `mcp-config.json`). Make sure you don't overwrite my existing `.env` files."

### Step 3: Feature Architecture
> "Analyze my `pages/BasePage.ts` (or your custom wrapper) and create a summary of accessible methods. Store these as 'Architecture Notes' in the path defined in my `mcp-config.json`. I want all future tests to strictly follow the POM pattern and avoid direct library calls in step files."

---

## 2. `mcp-config.json` Questionnaire

Before finalizing your setup, review this questionnaire. These values control how the AI thinks and writes code for your team.

| Configuration Field | Your Decision | Example / Guide |
| :--- | :--- | :--- |
| **`tags`** | Which tags should the AI suggest? | `["@smoke", "@regression", "@e2e"]` |
| **`dirs`** | Where should files be saved? | `{ "features": "src/tests/features", "pages": "src/pages" }` |
| **`authStrategy`** | How do we handle login? | `"users-json"` (Recommended) or `"none"` for public sites. |
| **`waitStrategy`** | When is a page "ready"? | `"networkidle"` (SPA focus) or `"domcontentloaded"` (Static focus). |
| **`basePageClass`** | Do you use a custom wrapper? | `"@company/test-toolkit"` or `"./pages/BasePage.ts"` |
| **`testRunTimeout`** | Max time for a full run? | `120000` (2 mins) for standard; `300000` (5 mins) for heavy apps. |
| **`projectRoot`** | Where is your actual code? | Absolute path if your VS Code workspace is at a higher level than your tests. |
| **`a11yStandards`** | Which standards to test? | `["wcag2aa", "wcag21aa"]` (See [Accessibility Guide](Accessibility.md)) |

### Example Config Table
| Need | setting | value |
| :--- | :--- | :--- |
| **Clean Gherkin** | `backgroundBlockThreshold` | `3` (Auto-merges repeated steps into Background blocks) |
| **Heavy Retries** | `selfHealMaxRetries` | `5` (If your UI is very dynamic/flaky) |
| **Strict POM** | `architectureNotesPath` | `"docs/custom-wrapper-guide.md"` |
| **A11y Compliance**| `a11yStandards` | `["wcag2aa", "best-practice"]` |

---

## 3. The "POM Enforcement" Rule

To prevent the AI from "taking shortcuts" (like calling raw Playwright functions in steps), always include this in your session instructions if the analyzer detects a custom wrapper:

> "**ENFORCEMENT**: You must use the Page Object Model pattern. Every UI interaction must be encapsulated in a Page class method. Step definitions MUST NOT call `this.page.click()` directly; they must call `await loginPage.submitForm()` or equivalents."
