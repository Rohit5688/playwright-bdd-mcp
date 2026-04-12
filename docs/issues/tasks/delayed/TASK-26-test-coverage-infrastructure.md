# TASK-26 — Test Coverage Infrastructure: 90% Threshold + Regression Gate

**Status**: TODO  
**Applies To**: TestForge (`c:\Users\Rohit\mcp\TestForge`) + AppForge (`c:\Users\Rohit\mcp\AppForge`)  
**Tier**: Cross-cutting (do after Tier 1 tasks in each repo)  
**Effort**: Medium (~45 min total, both repos)  
**Build check**: `npm test` must show coverage report and pass threshold  

---

## Context (No Prior Chat Needed)

Both AppForge and TestForge use the **Node.js built-in test runner** (`node --test dist/tests/`):
- AppForge `package.json:17` — `"test": "npm run build && node --test dist/tests/"`
- TestForge `package.json:9` — `"test": "npm run build && node --test dist/tests/"`

Node's built-in runner does NOT support coverage. We need to switch to **c8** (the standard
coverage tool for Node.js ESM projects — wraps `node --test` with V8 coverage).

### Current test inventory
- **AppForge**: 19 test files in `src/tests/` — good coverage of some services
- **TestForge**: 4 test files in `src/tests/` — very thin coverage

### The Policy
> **Do not move to the next task phase until:**
> 1. `npm test` passes with zero failures
> 2. Coverage report shows ≥ 90% for lines, functions, and branches
> 3. New code written in the task has unit tests

This is enforced via the `--check-coverage` flag and thresholds in the configuration.

---

## What to Change (Same Steps for Both Repos)

### Step 1 — Install c8

In both `c:\Users\Rohit\mcp\AppForge` and `c:\Users\Rohit\mcp\TestForge`:

```bash
npm install --save-dev c8
```

Verify it's in `devDependencies` after install.

---

### Step 2 — Update `package.json` scripts (both repos)

> ⚠️ **Cross-platform rule**: Never use `&&` in npm scripts — it breaks in PowerShell on Windows.
> Use the `pre*` lifecycle hook instead. npm runs `pretest` automatically before `test` on
> every platform (Windows/Mac/Linux) because npm handles sequencing, not the shell.

**Current `test` script (broken on Windows PowerShell):**
```json
"test": "npm run build && node --test dist/tests/"
```

> This is already fixed in `package.json` — do not revert it.

**Add the c8 wrapper to the existing fixed scripts:**
```json
"pretest": "tsc",
"test": "c8 --check-coverage node --test dist/tests/",
"test:watch": "node --test --watch src/tests/",
"test:coverage": "c8 --reporter=text --reporter=html node --test dist/tests/",
"test:ci": "c8 --reporter=lcov node --test dist/tests/"
```

> `pretest:coverage` lifecycle hooks don't exist — only `pretest` works.
> For `test:coverage` and `test:ci`, `pretest` already compiled, so these are safe to run
> after any `npm test` or `npm run build`. In CI, always run `npm test` first (not `test:coverage`).

---

### Step 3 — Create `.c8rc.json` coverage config (both repos)

Create at the project root (e.g., `c:\Users\Rohit\mcp\TestForge\.c8rc.json`):

```json
{
  "include": ["dist/**/*.js"],
  "exclude": [
    "dist/tests/**",
    "dist/index.js",
    "node_modules/**"
  ],
  "reporter": ["text", "text-summary"],
  "check-coverage": true,
  "lines": 90,
  "functions": 90,
  "branches": 80,
  "statements": 90,
  "all": true
}
```

> **Why branches at 80% not 90%?**  
> Branch coverage counts every if/else, ternary, and switch arm. Many are defensive null
> checks and early returns that are impossible to trigger in unit tests without mocking
> the entire FS. 80% is pragmatic for services that interact heavily with the filesystem.
> Lines/functions/statements at 90% still forces meaningful test coverage of core logic.

> **Why exclude `dist/index.js`?**  
> `index.ts` is the MCP router (tool handler switch). It's integration-level code that
> would require mocking the MCP SDK. Unit test coverage of services is what matters.
> Integration tests for `index.ts` come later.

---

### Step 4 — Add `.c8rc.json` to `.gitignore` exclusions (keep it)

Actually keep `.c8rc.json` in version control — it defines the team standard. Instead, add
`coverage/` to `.gitignore` in both repos so the generated HTML report is not committed:

```
# Test coverage output
coverage/
```

---

### Step 5 — TestForge: Write missing baseline tests

TestForge has only 4 test files. Before enforcing 90% coverage, we need baseline tests for
the most critical services. Write minimal smoke tests for each of these (they don't need to be
exhaustive — just enough to move coverage above 0% and catch regressions):

| Missing Test File | Service to Test | Min Test Cases |
|---|---|---|
| `McpConfigService.test.ts` | `McpConfigService` | read() returns default, merge() deep merges, write() persists |
| `TestRunnerService.test.ts` | `TestRunnerService` | command constructs correct flags, env vars injected |
| `FileWriterService.test.ts` | `FileWriterService` | allowlist blocks outside dirs, passes allowed dirs |
| `SuiteSummaryService.test.ts` | `SuiteSummaryService` | returns error when features dir missing |
| `EnvManagerService.test.ts` | `EnvManagerService` | read() parses KEY=VALUE, write() skips secrets |

Write these in `src/tests/` using the same `node:test` + `node:assert` pattern already used
in the existing 4 test files. Look at `SecurityUtils.test.ts` as a style reference.

---

### Step 6 — AppForge: Audit coverage gaps

AppForge has 19 test files but may have gaps. After running `npm test:coverage`, open
`coverage/index.html` and identify which services are below 90%. Write additional tests for
those services. Priority: focus on services modified by Tier 1-4 tasks.

---

## Verification

1. Run `npm test` in TestForge — must show coverage ≥ 90% and pass
2. Run `npm test` in AppForge — must show coverage ≥ 90% and pass
3. Deliberately delete a `return` statement in one service method → `npm test` should fail (regression test)
4. Run `npm run test:coverage` → `coverage/index.html` opens in browser with per-file breakdown

---

## The Testing Protocol (Apply to All Future Tasks)

From this task onward, every task file's Done Criteria MUST include:
```
- [ ] npm test passes with zero failures
- [ ] Coverage remains at or above 90% (lines/functions/statements)
- [ ] New code written in this task has corresponding test cases in src/tests/
```

If a task modifies a service that has no test file, a test file must be created as part of that task.

---

## Done Criteria
- [ ] `c8` installed in devDependencies of both AppForge and TestForge
- [ ] `package.json` updated with all 4 test scripts in both repos
- [ ] `.c8rc.json` created in both repos with thresholds as specified
- [ ] `coverage/` added to `.gitignore` in both repos
- [ ] TestForge: 5 baseline test files written (McpConfig, TestRunner, FileWriter, SuiteSummary, EnvManager)
- [ ] AppForge: coverage gaps identified and patched
- [ ] `npm test` passes at ≥ 90% in TestForge
- [ ] `npm test` passes at ≥ 90% in AppForge
- [ ] Change `Status` above to `DONE` in both repos' README

---

## Note: Why NOT Vitest/Jest?

Both repos already use `node --test` (native test runner, no extra dependency, ESM-native).
`c8` wraps it with V8 coverage — same test syntax, zero migration cost.
Switching to Vitest would require migrating all 23 existing test files (risky).
`c8` + `node --test` is the right choice for this codebase.
