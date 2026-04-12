# TestForge Hardening & New Requirements Plan (Deep Revision)

This plan outlines the technical implementation of **11 verified issues** AND **7 new capability requirements**. We are transforming TestForge into a truly project-agnostic engine that adapts its logic based on the internal `mcp-config.json` specifications ("The Bible").

## User Review Required

> [!IMPORTANT]
> **"Zero-Hardcode" Deep Discovery**
> TestForge will no longer assume any folder structure (like `src/`). It will perform a deep recursive scan of the project root, identifying features, steps, and configs by their **content signatures** rather than their names.

> [!IMPORTANT]
> **Full Dependency Recognition (FDR)**
> We will parse lockfiles (`yarn.lock`, etc.) and source code imports to discover **indirect/transitive dependencies**. This allows TestForge to understand your "Implicit Framework" even if it's hidden inside a custom company wrapper.

---

## Proposed Changes

### 1. `McpConfig` Extension (The Bible)

#### [MODIFY] `McpConfigService.ts`
- **Extend `McpConfig` interface with:**
  - `playwrightConfig`: Path to config (supports any depth).
  - `tsconfigPath`: Path to the project's `tsconfig.json`.
  - `testImportSource`: e.g., `@playwright/test` vs your custom wrapper.
  - `pageObjectPattern`: `instance` | `static`.
  - `methodTemplates`: Mapping actions (click, fill) to custom code snippets.
  - `userStoreFormat`: `standard` | `persona-env`.
  - **`dirs` Extensions**: `utils`, `models`, `helpers`, `types`, **`authStates`**.
  - **`repoContext`**: A dynamic object storing discovered repo-specific traits (flags, patterns).
  - **`defaultArgs`**: Global CLI flags (e.g., `["--headless"]`).

---

### 2. FDR & Deep Discovery Engine

#### [NEW/MODIFY] `McpConfigService.ts` logic
- **Recursive Indicator Scan**: 
  - Scan for `*.feature` → Identify `dirs.features`.
  - Scan for `Given/When/Then` imports → Identify `dirs.stepDefinitions`.
  - Scan for `utils/` or `helpers/` → Identify `dirs.utils`.
- **Lockfile & Import Trace**:
  - Parse lockfiles to identify transitive engines (e.g., finding `got` inside a wrapper).
  - Scan source `import` statements to fingerprint the team's actual usage patterns.
- **Wrapper Peeking**:
  - Use `ts-morph` to analyze custom wrapper exports.
  - Catalog internal API methods (e.g., `client.post()`) and add them to `repoContext`.

---

### 3. Standardized BDD & Generation Core

#### [MODIFY] `TestGenerationService.ts`
- **Standardized BDD Init**: Strictly use the parameterless `createBdd()` pattern.
- **Template Injection**: If `methodTemplates` are configured, replace standard Playwright calls with the team's custom wrapper snippets.
- **Static vs Instance**: Dynamically generate `static` methods if `pageObjectPattern: 'static'` is set.
- **Dynamic Imports**: Use a priority chain (`config.testImportSource` -> Detected Wrapper -> Default).

#### [MODIFY] `JsonToPomTranspiler.ts`
- Implement toggles for `static` class generation and template-based method bodies.

---

### 4. Hardening Fixes (11 Issues)

- **Issue 1 (Resolution)**: Use `require.resolve(..., { paths: [projectRoot] })` and `.d.ts` fallback parsing to find custom wrappers safely.
- **Issue 2, 4, 8 (Paths)**: Replace all hardcoded paths with `config.dirs`. Critically: **emit clear warnings** (e.g., "Configured features dir is empty") instead of failing silently or returning false positives.
- **Issue 3 (Env)**: Regex scan of all root `.env*` files AND any env subdirectories to extract custom keys accurately.
- **Issue 5 (Users)**: Check `authStrategy`, allowing `manage_users list` to read existing 150+ user structures instead of demanding a scaffold.
- **Issue 6 (Write Block)**: Build the `validate_and_write` allowlist strictly from `config.dirs` + `config.allowedWritePaths`.
- **Issue 7 (Self-Heal)**: Add pattern classification for all 5 error types: `LOCATOR_HIDDEN`, `SCROLL_ISSUE`, `OVERLAY_BLOCKING`, `WAIT_TIMEOUT`, and `CLICK_TIMEOUT`.
- **Issue 9 (Tool Rename)**: Rename generation tool to `prepare_test_generation_prompt` to clarify it is an AI-routing tool.
- **Issue 10 (PlaywrightConfig)**: Add `playwrightConfig` to `McpConfig` interface and `DEFAULT_CONFIG`. Pass `--config=${config.playwrightConfig}` to all execution commands.
- **Issue 11 (BDD Detection)**: Scan the file indicated by `playwrightConfig` and `package.json` scripts for accurate BDD detection.

---

### 5. Deep Hardening & Architectural Autowiring

#### [MODIFY] `validate_and_write` logic
- **TSConfig Autowiring (Requirement 28)**: 
  - If a write operation creates a NEW top-level directory (`models/`, `types/`, `helpers/`), TestForge will **automatically update `tsconfig.json`** to add the corresponding `compilerOptions.paths` alias.
- **Auto-Scaffolding**:
  - If the AI wants to generate a model but the `dirs.models` folder is missing, `validate_and_write` will offer to create the directory structure first.

#### [MODIFY] `JsonToPomTranspiler.ts`
- **DLO (Data Layer Object) Support**:
  - Update method argument generation to handle **Interface/Type models**.
- **`defaultArgs` (Issue 10)**:
  - Automatically merge `defaultArgs` into all `run_playwright_test` commands.

---

### 6. Autonomous Learning Loop

#### [MODIFY] `McpConfigService.ts`
- **Autonomous Training**: 
  - After any "Deep Discovery" scan, the engine will automatically call **`train_on_example`** for project-specific patterns discovered.
- **Architecture Notes Logging**:
  - Findings are logged to **`docs/mcp-architecture-notes.md`** to provide the AI and humans with total transparency into the recognized repo-specific rules.

---

## Verification Plan

### Automated
1. `npm build` to verify the schema and transpiler type safety.
2. New unit tests for **TSConfig Autowiring** and **Lockfile Parsing**.

### Manual
1. **The "New Architecture" Test**: Run a tool that creates a `models/` folder and verify `tsconfig.json` is updated automatically.
2. **The "Persona Write" Test**: Use `manage_users` to add a persona and verify it's correctly nested in the `persona-env` format.
3. **The "Profile" Test**: Set a default `--project` flag and verify all test runs respect it.
4. **The "Discovery Log" Test**: Check `docs/mcp-architecture-notes.md` after the first run to ensure the "FDR" findings are accurate.

---

## 7. Additional Architectural Hardening (Added during review)

> [!WARNING]
> The following gaps were identified during the review of the previous plan and must be addressed to comply with global architectural rules.
> 
> *Note: Implementation of the items in this section should proceed only if practically and logically correct to implement within the current architecture and project constraints.*

#### [NEW] Performance, Caching & Invalidation (Deep Discovery)
- **Problem**: Recursive directory scanning, AST parsing, and lockfile reading are highly resource-intensive. Furthermore, a stale cache makes the tools blind to new files.
- **Solution**: 
  - Cache the results of Full Dependency Recognition (FDR) and Deep Discovery (e.g., in `.testforge-cache.json`).
  - Implement a lightweight cache invalidation strategy (e.g., checking `mtime` of `package.json` or `mcp-config.json`, or offering a `--refresh` flag via MCP).

#### [NEW] Zombie Process Cleanup (The Resource Leak)
- **Problem**: When running `npx playwright test` via `TestRunnerService`, tests that hang indefinitely or are interrupted by the IDE can leave detached Playwright Chromium processes consuming memory.
- **Solution**: Implement structured `try/finally` blocks in `TestRunnerService.ts` utilizing process-tree killing to guarantee cleanup of all child processes on timeout, failure, or interruption.

#### [NEW] Strict Pre-write Syntax Validation (The Broken Data-chain)
- **Problem**: AI tools frequently generate TypeScript code with missing brackets, rogue commas, or bad imports. `validate_and_write` path checks aren't enough.
- **Solution**: Optionally execute a fast syntax check (e.g. `tsc --noEmit`) in memory or on scratch copies before `validate_and_write` commits any generated file to the target paths. Return compiler errors back to the AI for immediate self-correction.

#### [NEW] Config Schema Enforcement & Merging
- **Problem**: `mcp-config.json` lacks runtime schema validation on read, and modifying it with nested objects risks data loss if not merged safely.
- **Solution**: 
  - Validate reads against a strict schema (e.g., Zod) and return localized, safe fallback warnings instead of exceptions.
  - Implement intelligent deep-merging during updates to strictly protect user customizations (e.g., `methodTemplates`).

#### [NEW] Command Injection Security (The "Zero-Trust" Rule)
- **Problem**: Constructing shell commands via `join(' ')` (e.g. `npx playwright test --grep "${tags}"`) is vulnerable to shell string injection.
- **Solution**: Refactor execution runners (`runner.runTests`) to bypass string interpolation. Pass argument arrays directly to `child_process.spawn()` to guarantee cross-platform safety.

#### [NEW] Defensive Boundary Crossing for FDR
- **Problem**: Complex `tsconfig.json` mappings or non-standard wrappers can crash AST parsers like `ts-morph`, taking down the `analyze_codebase` tool.
- **Solution**: Wrap logic like "Wrapper Peeking" and Lockfile processing in strict `try/catch` boundaries. If parsing fails, log a warning and fallback gracefully instead of throwing exceptions.

#### [NEW] Monorepo Hoisting & Module Formats (ESM vs CJS)
- **Problem**: `require.resolve()` fails in Monorepos (Nx/Turborepo) if packages are hoisted. Furthermore, tools don't respect whether to use `import` vs `require`.
- **Solution**: Inspect `package.json` for `"type": "module"` to guide generation output, and support upward path resolution to find the true root `node_modules` during deep discovery.
