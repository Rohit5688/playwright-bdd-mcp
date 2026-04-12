# Project Extensions — Context Injection Design

**Applies to**: TestForge + AppForge  
**Status**: Design locked, implementation pending  
**Consumed by**: TASK-04 (TestForge schema), TASK-18 (AppForge schema), TASK-25 (injection wiring)

---

## Problem

Projects have config files that TestForge/AppForge cannot know in advance:
- Feature flag YAML (Split.io, LaunchDarkly) — determines which UI elements are rendered
- Logger config — determines where to read test execution logs
- API endpoint registry — determines which base URLs tests should hit
- custom `test.config.yaml` — environment-specific overrides

The naive solution is `extraConfig: Record<string, any>` — a passive blob that MCP stores but
never reads. That fails the user's constraint: **"I don't want a config param MCP never uses."**

---

## Design: `projectExtensions: ProjectExtension[]`

Each entry describes one project-specific config file: what it is, where it is, and which
MCP operations should read and inject its contents into their LLM context.

### TypeScript Interface

```typescript
export interface ProjectExtension {
  /**
   * Short identifier. Used in injection labels so the LLM knows what it's reading.
   * Example: "featureFlags" | "appLogger" | "apiRegistry"
   */
  name: string;

  /**
   * MANDATORY. Written by the user, read verbatim by the LLM.
   * Tell the LLM what this file is and how it should affect behavior.
   * This is the most important field — it's the instruction to the LLM.
   *
   * Good example:
   *   "LaunchDarkly feature flags for the staging environment.
   *    If a flag value is false, the corresponding UI feature does not render.
   *    When generating tests for features behind flags, add @skip if the flag is false.
   *    When analyzing test failures, check if a disabled flag is hiding the element."
   *
   * Bad example: "feature flags"
   */
  description: string;

  /**
   * Path to the file, relative to projectRoot.
   * Example: "config/flags.yaml" | "logs/app.log" | "config/test.config.json"
   */
  path: string;

  /**
   * How to parse the file. Auto-detected from extension if omitted.
   * 'yaml' → parsed as YAML object, serialized to readable key:value
   * 'json' → parsed as JSON, pretty-printed
   * 'text' → raw text (use maxLines for log files)
   * 'env'  → parsed as KEY=VALUE pairs
   */
  format?: 'yaml' | 'json' | 'text' | 'env';

  /**
   * Which MCP operations inject this file's contents into their LLM context.
   * ONLY listed operations read the file. If empty, file is never read (invalid — warn user).
   *
   * 'generate' → generate_gherkin_pom_test_suite, generate_fixture
   * 'analyze'  → analyze_codebase
   * 'heal'     → self_heal_test
   * 'run'      → run_playwright_test (env vars injected into subprocess)
   * 'check'    → check_environment (validates file exists)
   */
  injectInto: Array<'generate' | 'analyze' | 'heal' | 'run' | 'check'>;

  /**
   * For format:'text' files (e.g. log files). Only the last N lines are injected.
   * Default: 100. Prevents injecting 50MB log files into the prompt.
   */
  maxLines?: number;

  /**
   * If true, check_environment will FAIL (not warn) if this file is missing.
   * Use for files that are essential for tests to function correctly.
   * Default: false
   */
  required?: boolean;
}
```

---

## How Each Operation Uses It

### `generate` — Test & Fixture Generation

```
Before building the generation prompt in TestGenerationService / generate_fixture:

1. Filter: extensions where injectInto.includes('generate')
2. For each: read file, parse by format, inject into system prompt:

   ### Project Extension: featureFlags
   Context: LaunchDarkly feature flags for staging. If a flag is false, the
   corresponding UI feature does not render. Add @skip to tests for false flags.

   ```yaml
   checkout_v2: true
   new_dashboard: false
   split_payment: true
   ```

3. LLM now knows: generate tests for checkout_v2 and split_payment,
   skip new_dashboard tests with @skip tag.
```

### `analyze` — Codebase Analysis

```
Before returning CodebaseAnalysisResult in CodebaseAnalyzerService:

1. Filter: extensions where injectInto.includes('analyze')
2. Read files, inject into the analysis context sent to the LLM.

Use case: API registry tells the analyzer which endpoints are mocked vs live.
The LLM adjusts its "missing mock" warnings accordingly.
```

### `heal` — Self-Heal Test Failures

```
Before building the heal classification prompt in SelfHealingService:

1. Filter: extensions where injectInto.includes('heal')
2. Read log files (maxLines respected — last 100 lines only)
3. Inject BEFORE the test failure output:

   ### Recent Application Logs (last 100 lines)
   Context: Application log. Errors here indicate APP failures (not scripting bugs).
   [2026-04-03 04:22:11] ERROR: NullPointerException in CheckoutService.processPayment()
   [2026-04-03 04:22:11] ERROR: Failed to load cart for user_id=9821

4. LLM now correctly classifies "element not found on checkout page" as APP error
   (NullPointerException crashed the page) rather than a broken locator.
```

### `run` — Test Execution

```
Before spawning the test subprocess in TestRunnerService:

1. Filter: extensions where injectInto.includes('run')
2. For 'env' format files: parse KEY=VALUE pairs, inject as process env vars
3. For 'json'/'yaml' format: flatten to env vars (e.g. flags.checkout_v2 → FEATURE_CHECKOUT_V2=true)

Use case: Split.io config needs to reach the test process as env vars so
Playwright test code can call `getFlag('checkout_v2')` without separate setup.
```

### `check` — Environment Pre-flight

```
EnvironmentCheckService adds checks for ALL extensions where injectInto.includes('check'):

For each extension marked 'check':
  - If required: true and file missing → status: 'fail' (blocks run)
  - If required: false (default) and file missing → status: 'warn' (advisory)
  - If file exists → status: 'pass', message: "{name} found at {path}"

Result: Users know before running tests that their feature flag file is missing.
```

---

## Boundary: `projectExtensions` vs `repoContext`

These are complementary, not competing:

| | `repoContext` | `projectExtensions` |
|--|---------------|---------------------|
| **Content** | Static facts, architecture decisions | Dynamic config files that change |
| **Format** | Free-form JSON the user types in | Actual files on disk (YAML, JSON, logs) |
| **Injection** | Always injected into ALL operations | Only injected into listed `injectInto` operations |
| **Update frequency** | Rarely (project conventions change infrequently) | Frequently (flags change per deploy) |
| **Example** | `{ "authPattern": "OAuth2 PKCE", "pageObjectStyle": "singleton" }` | `{ "name": "flags", "path": "config/flags.yaml", "injectInto": ["generate", "heal"] }` |

**Rule of thumb:**
- _"This is something the LLM should know about our team conventions"_ → `repoContext`
- _"This is a file that changes and specific tools need to read"_ → `projectExtensions`

---

## Live Example: mcp-config.json

```json
{
  "projectExtensions": [
    {
      "name": "featureFlags",
      "description": "LaunchDarkly feature flags. If flag is false, the UI for that feature is hidden. When generating tests, add @pending to scenarios for disabled flags. When healing, check if a disabled flag caused the element to disappear.",
      "path": "config/flags.staging.yaml",
      "format": "yaml",
      "injectInto": ["generate", "heal", "check"],
      "required": true
    },
    {
      "name": "appLogger",
      "description": "Application test log. Errors here are APP-level failures. If a log error correlates with a test failure timeline, classify as APP not SCRIPTING.",
      "path": "logs/test-run.log",
      "format": "text",
      "maxLines": 80,
      "injectInto": ["heal"]
    },
    {
      "name": "apiRegistry",
      "description": "REST API endpoint registry. Lists all endpoints by service name and whether they are mocked in tests. Use this when generating test fixtures or identifying which calls need route interception.",
      "path": "config/api-endpoints.json",
      "format": "json",
      "injectInto": ["generate", "analyze"]
    },
    {
      "name": "splitTestConfig",
      "description": "Split.io experiment config. Which user cohorts see which variant. Use when generating test data factories — test users should be assigned to valid cohorts.",
      "path": "config/experiments.yaml",
      "format": "yaml",
      "injectInto": ["generate", "run"]
    }
  ]
}
```

---

## Implementation Plan

### Phase 1 — Schema Only (add to TASK-04 / TASK-18)
- Add `ProjectExtension` interface to `McpConfigService.ts` (both repos)
- Add `projectExtensions?: ProjectExtension[]` to `McpConfig` interface
- Add empty array `[]` as default in `DEFAULT_CONFIG`
- Add example entries (commented out) in `scaffoldMcpConfig()`

### Phase 2 — Utility (new shared util, ~1 session)
Create `src/utils/ExtensionLoader.ts`:
```ts
export async function loadExtensionsForOperation(
  projectRoot: string,
  extensions: ProjectExtension[],
  operation: 'generate' | 'analyze' | 'heal' | 'run' | 'check'
): Promise<string>  // returns formatted context string ready to inject into prompt
```

This utility:
1. Filters by `injectInto`
2. Reads each file (with `maxLines` for text)
3. Parses by `format` (auto-detect from extension if omitted)
4. Returns a formatted markdown context block

### Phase 3 — Wire Up (1 session per service)
Wire `loadExtensionsForOperation()` into:
- `TestGenerationService.ts` → `'generate'`
- `CodebaseAnalyzerService.ts` → `'analyze'`
- `SelfHealingService.ts` → `'heal'`
- `TestRunnerService.ts` → `'run'` (env var injection, not prompt)
- `EnvironmentCheckService.ts` → `'check'` (existence validation, not prompt)

---

## Non-Goals (out of scope by design)
- We do NOT watch files for changes (one-shot read per operation)
- We do NOT validate YAML/JSON schema of extension files (we trust user's description)
- We do NOT recursively follow references in extension files (one file, one read)
- Maximum injected content per extension: 10,000 characters (prevent context overflow)
