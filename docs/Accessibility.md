# Accessibility Testing Guide (Phase 42)

Automated accessibility (a11y) testing is built directly into the Playwright-BDD MCP workflow using `@axe-core/playwright`. This allows you to verify WCAG compliance as part of your functional BDD tests.

## 🚀 How to Use

### 1. Configuration
Define your target standards and report path in `mcp-config.json`:

```json
{
  "a11yStandards": ["wcag2aa", "wcag21aa", "best-practice"],
  "a11yReportPath": "test-results/a11y-report.json"
}
```

### 2. Gherkin Steps
Simply add an accessibility check to your feature files. The AI is trained to recognize these:

```gherkin
Scenario: Verify homepage accessibility
  Given I am on the homepage
  Then I check accessibility of the page
```

### 3. Page Object Method
Each generated Page Object inherits `checkAccessibility()` from `BasePage.ts`. You can call it manually in your step definitions:

```typescript
Then('I check accessibility of the page', async ({ homePage }) => {
  await homePage.checkAccessibility('Homepage Scan');
});
```

---

## 🏆 Supported Standards
You can use any of the following tags in `a11yStandards`:

| Standard | Tag(s) | Why use it? |
| :--- | :--- | :--- |
| **WCAG 2.0/2.1/2.2** | `wcag2a`, `wcag2aa`, `wcag22aa` | Industry standard for web accessibility. **AA** is the most common target. |
| **Section 508** | `section508` | Required for US Federal government projects. |
| **Best Practices** | `best-practice` | Goes beyond legal requirements to ensure a premium UX for all users. |
| **Regional (EU/FR)** | `en-301-549`, `rgaa` | Specific legal requirements for Europe and France. |
| **Component Specific** | `cat.aria`, `cat.forms` | Focus on specific accessibility patterns like ARIA or Form labels. |

---

## ❓ Why use a specific standard?

*   **WCAG 2.1 Level AA**: The "gold standard" for most commercial and public websites. It covers a wide range of recommendations for making Web content more accessible.
*   **Best Practices**: Use this during development to catch common UX pitfalls (like skipped heading levels) that aren't strictly illegal but hurt usability.
*   **Section 508**: Mandatory if you are bidding on or working on US government contracts.

## 🛠️ How it works
The `checkAccessibility` method uses `AxeBuilder` to scan the DOM. If violations are found:
1.  They are printed to the console with a detailed JSON breakdown.
2.  The test fails immediately (ensuring compliance).
3.  A summary is saved (if configured) to your `a11yReportPath`.
