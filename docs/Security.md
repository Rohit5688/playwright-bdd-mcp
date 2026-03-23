# Playwright BDD POM MCP Security Architecture

This document details the layered defensive security implementation of the Playwright BDD MCP server (introduced in Phase 35). Because this MCP server writes to disks, interfaces with APIs, and executes shell environments, it utilizes multiple guards to prevent data leakage and sandbox escapes.

## Core Threats Addressed

1. **Path Traversal & Sandbox Escape**: Preventing AI from overwriting system files.
2. **Credential Leakage**: Preventing CI/CD secrets or local tokens from returning to the LLM context.
3. **Hardcoded Secrets in Source Code**: Preventing the AI from hardcoding sensitive data in generated Page Objects.
4. **Command Injection**: Preventing hazardous characters from being spliced into `npx playwright test` commands.

## Security Layers

### 1. Project Root Path Guard
Inside the \`FileWriterService\`, every requested target file is processed via \`validateProjectPath(projectRoot, relativePath)\`.
This utility uses Node's \`path.resolve\` to merge the paths, and immediately throws if the resulting absolute path attempts to escape back out of the \`projectRoot\` directory (e.g. \`../../etc/passwd\`).

### 2. Directory Allow-List
The FileWriter enforces that generated files can ONLY be written to safely established testing directories:
- \`features/\`
- \`pages/\`
- \`step-definitions/\`
- \`test-data/\`
- \`fixtures/\`
- \`models/\`

Configuration files (like \`.env\` or \`mcp-config.json\`) are restricted and can ONLY be managed via their highly-constrained dedicated MCP tools (\`manage_env\` and \`manage_config\`).

### 3. Response-Level Secret Redaction
Before any terminal output (like a Playwright test exception or a read \`.env\` file) is returned to the MCP client, it passes through \`sanitizeOutput()\`.
This strips:
- Common env assignment forms (\`API_KEY=xxx\`)
- Password string literals
- JWT / Opaque Bearer tokens
- Authorization HTTP headers

### 4. Generated Code Secret Audit
Before the \`validate_and_write\` tool writes new files to disk, it audits the AI's \`content\` string by looking for hardcoded tokens using \`auditGeneratedCode()\`.
If it detects credentials embedded in the text, it warns the AI: \`🔒 SECRET AUDIT: Hardcoded credential(s) found... Please regenerate using process.env\`, giving the AI a chance to heal it dynamically.

### 5. Shell Argument Sanitization
When the user executes \`run_playwright_test\` passing custom grep tags (\`@smoke\`), the input is scrubbed of dangerous metacharacters (\`; & | > < \` $)\` to prevent injection into the Playwright \`exec()\` hook.

### 6. V8 Sandbox Isolation (Code Mode)
The `execute_sandbox_code` tool runs user-provided JavaScript inside a hardened V8 context using Node's `vm` module:

| Protection | Mechanism |
|---|---|
| **No `eval()` / `new Function()`** | Blocked at both static regex analysis AND `vm.createContext({ codeGeneration: { strings: false } })` |
| **No `require()` / `import()`** | Regex pre-scan + undefined in sandbox context |
| **No `process` / `globalThis`** | Regex pre-scan + excluded from context allowlist |
| **No `fetch` / network access** | Not injected into sandbox context |
| **Timeout enforcement** | Default 10s via `vm.Script.runInContext({ timeout })` |
| **Context isolation** | Fresh `vm.createContext()` per execution — no state leakage |
| **Console capture** | `console.log/warn/error` captured to array, not printed |

Only safe builtins are exposed: `JSON`, `Math`, `Date`, `Array`, `Object`, `String`, `Number`, `Boolean`, `Map`, `Set`, `RegExp`, `Promise`. Server services are accessed exclusively through the controlled `forge.api.*` bridge.
