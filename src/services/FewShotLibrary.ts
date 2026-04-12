import type { CodebaseAnalysisResult } from '../interfaces/ICodebaseAnalyzer.js';

/**
 * FewShotLibrary — Static building blocks for the Hybrid Prompt Engine.
 *
 *   1. CoT Scaffold: Mandatory 4-step reasoning protocol for every generate_gherkin_pom_test_suite call.
 *   2. Negative Examples: Web/Playwright-BDD anti-patterns that steer the LLM away from common mistakes.
 *
 * Intentionally static for stability and token efficiency.
 * Dynamic, project-specific examples come from HybridPromptEngine.selectChampion().
 */
export class FewShotLibrary {
  /**
   * Returns the mandatory Chain-of-Thought reasoning scaffold.
   * Adapted for Playwright-BDD POM (web), not Appium.
   */
  public static getCoTScaffold(): string {
    return `
## 🧠 MANDATORY REASONING PROTOCOL (Chain-of-Thought)
Before writing ANY code, follow this sequence in order:

**STEP 1 — AUDIT REUSE**: Search the "Existing Step Definitions" and "Existing Page Objects" sections above.
  - If a matching step already exists → REUSE it with EXACT wording. Do not paraphrase.
  - If a Page Object exists for the target screen → use its methods. Do NOT call inspect_page_dom.

**STEP 2 — VERIFY NEW LOCATORS**: Only for screens NOT covered by existing Page Objects:
  - Call \`inspect_page_dom\` (with the target URL) BEFORE writing locators.
  - Never guess \`data-testid\`, \`aria-label\`, or CSS selectors.

**STEP 3 — PLAN FILES**: Before writing, state which files you will CREATE or MODIFY.
  - Confirm your plan matches the detected architecture (BDD + POM).

**STEP 4 — EXECUTE**: Write COMPLETE, production-ready code. Rules:
  - No TODO comments. No empty method bodies. No stub logic.
  - Every file must compile. Every locator must be verified or reused.
`;
  }

  /**
   * Returns Playwright/BDD-specific anti-patterns (negative examples).
   */
  public static getNegativeExample(_analysis: CodebaseAnalysisResult): string {
    return `
## ❌ ANTI-PATTERNS — These cause build or runtime failures. DO NOT generate:

\`\`\`typescript
// ❌ BAD: Positional XPath — breaks on any layout change
await page.locator('//div[1]/button[2]').click();

// ❌ BAD: Direct Playwright calls inside step definitions — violates POM
When('I click login', async () => { await page.locator('[data-testid="login"]').click(); });

// ❌ BAD: Stub body — REJECTED by Stub Hunter
async clickLogin(): Promise<void> { /* TODO */ }

// ❌ BAD: Hardcoded URL in Page Object
async navigate() { await this.page.goto('https://example.com/login'); }
\`\`\`

\`\`\`typescript
// ✅ GOOD: Stable locator from inspect_page_dom
get loginBtn() { return this.page.getByTestId('login-button'); }

// ✅ GOOD: Step delegates to Page Object method only
When('I click the login button', async () => { await loginPage.clickLogin(); });

// ✅ GOOD: Full implementation
async clickLogin(): Promise<void> { await this.loginBtn.click(); }

// ✅ GOOD: Uses baseURL from config
async navigate() { await this.page.goto('/login'); }
\`\`\`
`;
  }
}
