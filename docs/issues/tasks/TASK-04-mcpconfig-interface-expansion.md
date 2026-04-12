# TASK-04 — Expand McpConfig Interface

**Status**: TODO  
**Tier**: 2 (Core Platform Consistency)  
**Effort**: Small (~20 min)  
**Depends on**: TASK-01 (deep merge — must be DONE)  
**Required by**: TASK-21 (command construction needs `playwrightConfig`, `tsconfigPath`), TASK-22 (env check), TASK-24 (browsers)  
**Build check**: `npm run build` in `c:\Users\Rohit\mcp\TestForge`

---

## Context (No Prior Chat Needed)

`McpConfigService.ts` defines the `McpConfig` TypeScript interface. Several fields that are
actively used in tool handlers are missing from this interface. This forces developers to write
`(config as any).playwrightConfig` — bypassing type safety.

This task: **schema changes only**. Adding fields to the interface + DEFAULT_CONFIG + JSDoc.
Wiring the fields up to actual services happens in TASK-21, TASK-22, TASK-07, TASK-08.

---

## Target File

`src/services/McpConfigService.ts`

---

## What to Change

### Step 1 — Add new fields to the `McpConfig` interface

Locate the `McpConfig` interface. Add the following fields with JSDoc:

```typescript
/**
 * Relative path to playwright.config.ts when it is NOT at the project root.
 * Example: "config/playwright.config.ts"
 * When set: passed as --config to both bddgen and playwright test commands.
 * When null/undefined: assumes playwright.config.ts is at project root.
 */
playwrightConfig?: string | null;

/**
 * Relative path to the TypeScript config file (tsconfig.json).
 * When set, ALWAYS passed as --tsconfig <path> to playwright test.
 * User-supplied — no auto-detection. Both root and non-root tsconfigs work.
 * Example: "tsconfig.json" | "config/tsconfig.test.json"
 */
tsconfigPath?: string | null;

/**
 * Directory paths for this project's test structure.
 * Overrides TestForge defaults when your project uses non-standard folder names.
 */
dirs?: {
  /** Folder containing .feature files. Default: "features" */
  features?: string;
  /** Folder containing Page Object .ts files. Default: "pages" */
  pages?: string;
  /** Folder containing step definition .ts files. Default: "step-definitions" */
  stepDefinitions?: string;
  /** Folder containing test data / fixture files. Default: "test-data" */
  testData?: string;
  /** Folder containing shared utility helpers. Default: "utils" */
  utils?: string;
};

/**
 * List of browsers to install and use in tests.
 * Used by setup_project and upgrade_project when running playwright install.
 * Default: ["chromium"]
 */
browsers?: Array<'chromium' | 'firefox' | 'webkit'>;

/**
 * Repository-level context for the Deep Discovery Engine (analyze_codebase).
 * Store stable facts about the repo here (tech stack, auth patterns, etc.).
 * The LLM reads this to bring context without re-scanning on every call.
 */
repoContext?: Record<string, unknown>;

/**
 * Default CLI arguments appended to every playwright test run.
 * Example: ["--workers=4", "--reporter=list"]
 */
defaultArgs?: string[];

/**
 * Keys used to look up values in your .env file.
 * Allows TestForge to read the correct env variable for each concept.
 */
envKeys?: {
  /** Name of the env var holding the app base URL. Default: "BASE_URL" */
  baseUrl?: string;
  /** Name of the env var holding the test environment name. Default: "TEST_ENVIRONMENT" */
  environment?: string;
};

/**
 * Project-specific config files that TestForge tools should read and inject
 * into their LLM context. For each entry: the tool reads the file, parses it,
 * and prepends it to the generation/analysis/healing prompt.
 *
 * This is NOT a passive data store — tools ONLY read files listed here,
 * and only for the operations listed in `injectInto`.
 *
 * Use this for: feature flags, logger config, API registries, custom test config YAML.
 * Use `repoContext` instead for: static team conventions, architecture decisions.
 *
 * See docs/issues/project-extensions-design.md for the full design.
 */
projectExtensions?: Array<{
  /** Short identifier used in injection labels. Example: "featureFlags" */
  name: string;

  /**
   * MANDATORY — tells the LLM what this file is and how it should change behavior.
   * Be explicit: "If flag is false, the UI is hidden. Add @skip to tests for false flags."
   */
  description: string;

  /** Path to the file, relative to projectRoot. Example: "config/flags.yaml" */
  path: string;

  /**
   * File format for parsing. Auto-detected from extension if omitted.
   * 'yaml' | 'json' | 'text' | 'env'
   */
  format?: 'yaml' | 'json' | 'text' | 'env';

  /**
   * Which operations inject this file's contents into their LLM context.
   * 'generate' → test/fixture generation prompts
   * 'analyze'  → analyze_codebase context
   * 'heal'     → self_heal_test failure classification
   * 'run'      → env vars injected into test subprocess
   * 'check'    → check_environment validates file exists
   */
  injectInto: Array<'generate' | 'analyze' | 'heal' | 'run' | 'check'>;

  /** Max lines to inject for 'text' format (log files). Default: 100 */
  maxLines?: number;

  /** If true, check_environment FAILS (not warns) when file is missing. Default: false */
  required?: boolean;
}>;

```

---

### Step 2 — Add defaults to `DEFAULT_CONFIG`

Locate `DEFAULT_CONFIG` (or equivalent default object in `McpConfigService`).
Only add fields that have sensible defaults (don't add undefined optional fields):

```typescript
playwrightConfig: null,
tsconfigPath: null,
dirs: {
  features: 'features',
  pages: 'pages',
  stepDefinitions: 'step-definitions',
  testData: 'test-data',
  utils: 'utils',
},
browsers: ['chromium'],
repoContext: {},
defaultArgs: [],
envKeys: {
  baseUrl: 'BASE_URL',
  environment: 'TEST_ENVIRONMENT',
},
```

---

### Step 3 — Update scaffold output in `McpConfigService` (if `scaffoldMcpConfig` exists here)

If the scaffold template is in `McpConfigService.ts`, add the new fields to it with comments.
If it's in `ProjectSetupService.ts`, skip this step — that file is handled in TASK-10.

---

### Step 4 — Remove all `as any` casts for these fields in `src/index.ts`

Search for:
```
(config as any).playwrightConfig
(config as any).dirs
(config as any).browsers
```

Replace each with the correctly-typed `config.playwrightConfig`, `config.dirs`, `config.browsers`.

---

## Verification

1. `npm run build` in `c:\Users\Rohit\mcp\TestForge` — zero errors.
2. No TypeScript errors on `config.playwrightConfig`, `config.tsconfigPath`, `config.dirs.features`.
3. `config.browsers` resolves to `string[]` without type casting.

---

## Done Criteria
- [ ] `npm run build` passes with zero errors
- [ ] `playwrightConfig?: string | null` in interface + JSDoc
- [ ] `tsconfigPath?: string | null` in interface + JSDoc
- [ ] `dirs?` nested object in interface + JSDoc for each sub-field
- [ ] `browsers?: Array<'chromium' | 'firefox' | 'webkit'>` in interface
- [ ] `repoContext?: Record<string, unknown>` in interface
- [ ] `defaultArgs?: string[]` in interface
- [ ] `envKeys?` nested object in interface
- [ ] `projectExtensions?: Array<{...}>` full inline type in interface with all sub-fields documented
- [ ] `DEFAULT_CONFIG` updated with sensible fallbacks for all new fields (`projectExtensions: []`)
- [ ] All `(config as any)` casts for new fields removed from `index.ts`
- [ ] Change `Status` above to `DONE`

---

## References
- Full `projectExtensions` design + usage examples: `docs/issues/project-extensions-design.md`
- Consumption wiring (Phase 2+3) is in TASK-25 — do NOT implement injection in this task

