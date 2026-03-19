# Playwright-BDD-POM-MCP Server 🚀

A powerful Model Context Protocol (MCP) server designed to automate Gherkin-based test generation, execution, and self-healing for Playwright-BDD projects using the Page Object Model (POM) pattern.

## Features
- **Project Bootstrapping**: Scaffolds full Playwright-BDD environments from scratch (`setup_project`).
- **Smart Analysis**: Scans your codebase to reuse existing Page Objects and step definitions (`analyze_codebase`).
- **Gherkin Generation**: Generates high-quality `.feature` and `.ts` files based on your specific patterns.
- **Self-Healing**: Automatically detects failures, inspects the DOM, and fixes locators/scripts up to 3 times (`validate_and_write`).
- **Flexible Config**: Custom tags, directory structures, and wait strategies via `mcp-config.json`.
- **Multi-User Store**: Environment-specific JSON credential management (`users.{env}.json`) with a typed `getUser()` helper.

---

## 📚 Documentation
For detailed guides and advanced usage, refer to the following resources:
- **[User Guide](docs/UserGuide.md)**: Learn about "Power Prompts", API fixtures, and TypeScript DTO generation.
- **[Docker & Deployment](docs/DockerSetup.md)**: Comprehensive guide for local, remote, and AWS containerization.
- **[Project Evolution](docs/ProjectEvolution.md)**: A technical look at the project's architecture and development milestones.
- **[Implementation Plan](docs/ImplementationPlan.md)**: Detailed roadmap of recent and upcoming feature phases.

---

## Quickstart

### 1. Installation
```bash
# Install from Git (Recommended for latest features)
npm install -g github:Rohit5688/playwright-bdd-mcp

# OR Clone and build locally
git clone https://github.com/Rohit5688/playwright-bdd-mcp.git
cd playwright-bdd-mcp

# Install and build
npm install
npm run build
```

### 2. Configure your MCP Client (e.g. Claude Desktop)
Add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright-bdd-automation": {
      "command": "node",
      "args": ["/absolute/path/to/playwright-bdd-pom-mcp/dist/index.js"]
    }
  }
}
```

### 3. Initialize a New Project
Ask your AI assistant:
> "Use the `setup_project` tool to initialize a new Playwright-BDD automation suite in `C:/my-tests`."

---

## Tool Reference

| Tool | Action | Summary |
|---|---|---|
| `analyze_codebase` | Context | Scans project for existing POMs, steps, and `mcp-config.json` rules. |
| `generate_gherkin_pom_test_suite` | AI | Returns a rigid generation instruction for high-quality test code. |
| `validate_and_write` | Write + Test | Writes the generated code, runs it, and auto-heals failures. |
| `run_playwright_test` | Run | Executes tests with optional tag filters (e.g., `@smoke`). |
| `inspect_page_dom` | Debug | Returns a semantic Accessibility Tree (AOM) for locator extraction. |
| `manage_config` | Config | Reads/writes/scaffolds `mcp-config.json` team preferences. |
| `manage_users` | Security | Manages environment-specific user roles and credentials. |
| `summarize_suite` | Report | Provides a plain-English status report of the entire test suite. |

---

## Governance & Configuration

### `mcp-config.json`
Located in your project root, this file controls global behavior:
```json
{
  "tags": ["@smoke", "@regression", "@p1"],
  "waitStrategy": "networkidle",
  "selfHealMaxRetries": 3,
  "currentEnvironment": "staging"
}
```

### Multi-User Credentials
Credentials are stored in `test-data/users.{env}.json` (e.g. `users.staging.json`).
- These files are **git-ignored** for security.
- Use `manage_users { action: "scaffold" }` to generate templates.
- Access them in your Page Objects via the generated `user-helper.ts`:
  ```typescript
  import { getUser } from '../test-data/user-helper';
  const { username, password } = getUser('admin');
  ```

---

## Technical Details
- **Base image**: `mcr.microsoft.com/playwright`
- **Transport**: Supports both `stdio` (default) and `sse` (via `--port`).
- **Dependencies**: `@modelcontextprotocol/sdk`, `playwright-bdd`, `@playwright/test`.

---

## License
ISC
