# 🚀 Token Optimizer — Code Mode Execution

The Token Optimizer (`execute_sandbox_code`) is a new MCP tool that dramatically reduces LLM token consumption by running JavaScript snippets inside a secure V8 sandbox on the MCP server.

---

## The Problem

Every MCP tool call costs tokens in two ways:

| Cost Type | Example | Tokens |
|---|---|---|
| **Schema overhead** | LLM must "see" 25+ tool schemas every message | ~5,000 |
| **Payload bloat** | `inspect_page_dom` returns full Accessibility Tree | ~10,000 |

A single "find a button locator" operation can cost ~12,000 tokens.

## The Solution

Instead of the LLM calling tools that return massive data, it writes a small JavaScript script that runs **on your machine**. The script calls server services locally, filters the data, and returns **only the final result**.

### Before (Classic): ~12,000 tokens
```
LLM → calls inspect_page_dom → receives 10,000 tokens of DOM → reads it all → responds
```

### After (Code Mode): ~200 tokens
```
LLM → sends 50-token script → sandbox processes DOM locally → returns 20-token answer
```

**Savings: up to 98%**

---

## How to Use

Ask your AI assistant to use the sandbox. Example prompts:

> "Using the sandbox, inspect https://www.saucedemo.com and find only the button elements"

> "Using the sandbox, analyze my codebase and tell me how many step definitions exist"

> "Using the sandbox, read my playwright.config.ts and return the timeout value"

The AI will write a script and call `execute_sandbox_code`:

```javascript
// Example: Find buttons on a page
const dom = await forge.api.inspectDom('https://www.saucedemo.com');
const lines = dom.split('\n');
const buttons = lines.filter(l => l.includes('[role="button"]'));
return buttons;
```

---

## Available APIs

Scripts have access to these server services via `forge.api.*`:

| Method | Description |
|---|---|
| `forge.api.inspectDom(url)` | Fetches page Accessibility Tree |
| `forge.api.analyzeCodebase(projectRoot)` | AST-based codebase analysis |
| `forge.api.runTests(projectRoot)` | Runs `npx bddgen && npx playwright test` |
| `forge.api.readFile(filePath)` | Reads a file from disk |
| `forge.api.getConfig(projectRoot)` | Reads `mcp-config.json` |
| `forge.api.summarizeSuite(projectRoot)` | Summarizes `.feature` files |

---

## Security

The sandbox enforces strict zero-trust isolation:

- ❌ `eval()`, `new Function()` — blocked
- ❌ `require()`, `import()` — blocked
- ❌ `process`, `globalThis` — blocked
- ❌ `fetch`, network access — blocked
- ✅ 10-second timeout enforcement
- ✅ Fresh V8 context per execution (no state leakage)
- ✅ Console output captured and returned

See [Security Architecture](Security.md) for the full security model.

---

## Token Savings Summary

| Operation | Classic (tokens) | Code Mode (tokens) | Savings |
|---|---|---|---|
| Find a locator | ~12,000 | ~200 | **98%** |
| Count steps | ~5,000 | ~100 | **98%** |
| Check config | ~2,000 | ~80 | **96%** |
| Read and filter a file | ~3,000 | ~150 | **95%** |
| Multi-step orchestration | ~20,000 | ~300 | **98.5%** |
