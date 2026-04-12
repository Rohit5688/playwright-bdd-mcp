# TASK-21 — Command Construction: Config Paths, TSConfig, Env Loading

**Status**: TODO  
**Tier**: Paths / Commands (P0 — breaks every test run on non-root config projects)  
**Effort**: Medium (~45 min)  
**Depends on**: TASK-04 (McpConfig interface must have `playwrightConfig`, `tsconfigPath`) — do that first  
**Merges**: TASK-20 (both affect the same call chain, fixing here fixes all three callers)  
**Build check**: `npm run build` in `c:\Users\Rohit\mcp\TestForge`

---

## Context (No Prior Chat Needed)

`TestRunnerService.ts` builds the test execution command as a raw concatenated string:

```ts
let command = 'npx bddgen && npx playwright test';
```

This has three critical gaps confirmed by the user in production:

1. **`bddgen` never gets `--config <path>`** — if `playwright.config.ts` isn't at project root,
   `bddgen` fails to find `defineBddConfig()` and generates zero step files silently.

2. **`playwright test` never gets `--config <path>`** — loads the wrong config, wrong
   `featuresRoot`, wrong `steps` globs, wrong timeouts.

3. **`playwright test` never gets `--tsconfig <path>`** — when the project uses TypeScript path
   aliases (`@pages/`, `@helpers/`) and tsconfig is not at the default location,
   type resolution fails and the test compilation breaks.

4. **Env file is never switched per environment** — `config.currentEnvironment` is set by the user
   (e.g., `'staging'`) but `.env.staging` is never loaded. The subprocess always inherits `.env`
   (local defaults), meaning tests run against the wrong base URL, credentials, feature flags.

---

## Target Files

- `src/services/TestRunnerService.ts` (primary)
- `src/services/McpConfigService.ts` (interface — read only, must have `playwrightConfig` and `tsconfigPath`)
- `src/services/EnvManagerService.ts` (utility — already has `read(root, envName)` method, no changes)

---

## What to Change

### File 1: `src/services/TestRunnerService.ts`

#### Step 1 — Update the `runTests()` signature to accept config

The method currently does not receive `McpConfig`. Add it as a parameter:

**Current signature:**
```ts
public async runTests(
  projectRoot: string,
  specificTestArgs?: string,
  timeoutMs?: number,
  executionCommand?: string
): Promise<TestRunnerResult>
```

**New signature:**
```ts
import type { McpConfig } from './McpConfigService.js';
import { EnvManagerService } from './EnvManagerService.js';

public async runTests(
  projectRoot: string,
  specificTestArgs?: string,
  timeoutMs?: number,
  executionCommand?: string,
  config?: McpConfig           // ← NEW: optional for backward compat
): Promise<TestRunnerResult>
```

> All existing callers (`index.ts`) pass `config` already from the handler — this is backward
> compatible because the param is optional. If `config` is undefined, all new logic gracefully skips.

---

#### Step 2 — Build config-aware commands

Replace the existing command-building block (lines 31-42) with the following logic.

**Remove:**
```ts
let command = 'npx bddgen && npx playwright test';

if (executionCommand) {
  command = executionCommand;
} else {
  // Auto-detect package manager locally if no custom executionCommand provided
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    command = 'yarn bddgen && yarn playwright test';
  } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    command = 'pnpm bddgen && pnpm exec playwright test';
  }
}
```

**Replace with:**
```ts
let command: string;

if (executionCommand) {
  // User supplied a fully custom command — honour it exactly, no flags injected
  command = executionCommand;
} else {
  // Detect package manager runner prefix
  let runner = 'npx';
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    runner = 'yarn';
  } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    runner = 'pnpm exec';
  }

  // --config flag: relative path to playwright.config when not at root
  const configFlag = config?.playwrightConfig
    ? ` --config ${config.playwrightConfig}`
    : '';

  // --tsconfig flag: ALWAYS passed when tsconfigPath is set by user in mcp-config.json
  // This is intentional — user explicitly provides the path. No auto-detection.
  const tsconfigFlag = config?.tsconfigPath
    ? ` --tsconfig ${config.tsconfigPath}`
    : '';

  // bddgen does NOT support --tsconfig, only --config
  const bddgenCmd = `${runner} bddgen${configFlag}`;

  // playwright test supports both --config and --tsconfig
  const pwCmd = `${runner} playwright test${configFlag}${tsconfigFlag}`;

  command = `${bddgenCmd} && ${pwCmd}`;
}
```

---

#### Step 3 — Load environment-specific .env before spawning

Add this block **after** the command is built and **before** the `execAsync` call.

```ts
// Resolve env vars for the current testing environment
// e.g. if config.currentEnvironment = 'staging', load .env.staging and merge into the process env
const envVarsToInject: Record<string, string> = {};
if (config?.currentEnvironment) {
  try {
    const envManager = new EnvManagerService();
    const envResult = envManager.read(projectRoot, config.currentEnvironment);
    if (envResult.exists) {
      Object.assign(envVarsToInject, envResult.values);
    }
    // Always set the environment name itself so tests and user helpers pick up the right file
    envVarsToInject['TEST_ENVIRONMENT'] = config.currentEnvironment;
  } catch {
    // Non-fatal: if env file is missing, tests still run with inherited environment
  }
}
```

Then update the `execAsync` call to inject these env vars:

**Current:**
```ts
const { stdout, stderr } = await execAsync(fullCommand, {
  cwd: projectRoot,
  timeout: runTimeout,
});
```

**Replace with:**
```ts
const { stdout, stderr } = await execAsync(fullCommand, {
  cwd: projectRoot,
  timeout: runTimeout,
  env: {
    ...process.env,          // inherit parent env
    ...envVarsToInject,      // overlay with env-specific values (wins on conflict)
  },
});
```

---

### File 2: `src/index.ts` — Pass config to all `runner.runTests()` calls

There are **3 callers** of `runner.runTests()` in `index.ts`. All must be updated to pass `config`:

1. **`run_playwright_test` handler** — already reads config from `McpConfigService`:
   ```ts
   // Find: runner.runTests(projectRoot, specificTestArgs, timeoutMs, executionCommand)
   // Replace with:
   runner.runTests(projectRoot, specificTestArgs, timeoutMs, executionCommand, config)
   ```

2. **`update_visual_baselines` handler** — same pattern, same fix.

3. **`validate_and_write` handler** — same pattern, same fix.

Search for all occurrences:
```
runner.runTests(
```
and add `, config` as the last argument to each one. The `config` object must already be
resolved in each handler via `mcpConfigService.read(projectRoot)`.

---

## Verification

1. `npm run build` — zero TypeScript errors.
2. Create a test project with `playwright.config.ts` at `config/playwright.config.ts` (not root).
3. Set `mcp-config.json`:
   ```json
   {
     "playwrightConfig": "config/playwright.config.ts",
     "tsconfigPath": "tsconfig.json",
     "currentEnvironment": "staging"
   }
   ```
4. Run `run_playwright_test` — verify the executed command contains:
   - `bddgen --config config/playwright.config.ts`
   - `playwright test --config config/playwright.config.ts --tsconfig tsconfig.json`
5. Verify `.env.staging` key/value pairs are present in the subprocess environment
   (add a `console.log(process.env.TEST_ENVIRONMENT)` in a test step temporarily).

---

## Done Criteria
- [ ] `npm run build` passes with zero errors
- [ ] `bddgen` command includes `--config` when `playwrightConfig` is set in config
- [ ] `playwright test` includes `--config` when `playwrightConfig` is set
- [ ] `playwright test` includes `--tsconfig` when `tsconfigPath` is set (regardless of whether tsconfig exists at root)
- [ ] `.env.{currentEnvironment}` values injected into subprocess env before test run
- [ ] `TEST_ENVIRONMENT` env var always set to `config.currentEnvironment` when present
- [ ] All 3 callers of `runner.runTests()` in `index.ts` pass `config`
- [ ] Existing projects with no custom config path still work (all flags are conditional on config fields being set)
- [ ] Change `Status` above to `DONE`
