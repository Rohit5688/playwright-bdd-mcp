# Team Collaboration & AI Learning

The Playwright BDD MCP Server doesn't just write code; it Learns from your team. As it generates UI tests, an LLM might repeatedly miss a specific idiosyncrasy of your application (like relying on `#shadow-root` or an obscure frontend framework). 

This MCP has a persistent localized memory (`.playwright-bdd-mcp/mcp-learning.json`) that overridingly modifies all future AI generations to prevent repeat mistakes.

## `train_on_example`
If an AI generates a bad Page Object syntax, and you fix it, you can explicitly teach the AI your fix. 
*   **issuePattern**: e.g., "Finding the Login Button"
*   **solution**: e.g., "Use `page.locator('button.auth-submit')` instead of `getByRole`"

**Example Prompt to AI:**
> *"I noticed you used getByText() for the navigation drawer, but our team strictly uses `data-testid` attributes. Train yourself on this example so you never do it again."*

## The `@mcp-learn` Scanner
Instead of using the explicit tool, Developers and QA Engineers can leave code comments directly inside their TypeScript tests or Page Objects!

```typescript
// @mcp-learn: When clicking the profile avatar -> Wait for the spinner to disappear first
test('Open Profile', async ({ page }) => {
   // ...
})
```
During the `analyze_codebase` phase, the MCP will dynamically extract these comments and inject them into the LLM context. This means humans can silently leave "Rule Zeros" across the repository, and the AI will adhere to them without any explicit prompts.

## `export_team_knowledge`
As your AI tests application over weeks and months, the `.playwright-bdd-mcp/mcp-learning.json` file will grow. Because this file is just raw JSON, it's hard for managers or manual QA testers to read.

By executing this tool, the MCP will convert its entire brain into a human-readable Markdown document (`docs/team-knowledge.md`). 

Commit this to your repository to share your autonomous framework's heuristics with your engineering team, or even use it as a developer onboarding guide!

**Example Prompt to AI:**
> *"Export your current team knowledge base into a markdown document so I can review what rules you have learned so far."*
