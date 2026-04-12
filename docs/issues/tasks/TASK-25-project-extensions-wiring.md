# TASK-25 — projectExtensions: ExtensionLoader Utility + Service Wiring

**Status**: TODO  
**Tier**: 3 (Path Enforcement & Command Construction)  
**Effort**: Medium (~60 min)  
**Depends on**: TASK-04 (McpConfig interface must have `projectExtensions` typed) — do that first  
**Build check**: `npm run build` in `c:\Users\Rohit\mcp\TestForge`  
**Test requirement**: Write tests in `src/tests/ExtensionLoader.test.ts` covering all 4 format types. All existing tests must pass.

---

## Context (No Prior Chat Needed)

We designed a `projectExtensions` mechanism that lets users declare project-specific config
files (feature flags, logger config, API registries) and specify which MCP operations should
read and inject their contents into the LLM prompt.

Design doc: `c:\Users\Rohit\mcp\TestForge\docs\issues\project-extensions-design.md`

This task implements:
1. The `ExtensionLoader` shared utility (reads, parses, formats for injection)
2. Wires it into 5 target services (`generate`, `analyze`, `heal`, `run`, `check`)

---

## Target Files

- **NEW**: `src/utils/ExtensionLoader.ts`
- **NEW**: `src/tests/ExtensionLoader.test.ts`
- `src/services/TestGenerationService.ts` (wire `'generate'`)
- `src/services/CodebaseAnalyzerService.ts` (wire `'analyze'`)
- `src/services/SelfHealingService.ts` (wire `'heal'`)
- `src/services/TestRunnerService.ts` (wire `'run'`)
- `src/services/EnvironmentCheckService.ts` (wire `'check'`)

---

## What to Change

### File 1 (NEW): `src/utils/ExtensionLoader.ts`

Create this utility with three exported functions:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { McpConfig } from '../services/McpConfigService.js';

type ExtensionOperation = 'generate' | 'analyze' | 'heal' | 'run' | 'check';
type ExtensionFormat = 'yaml' | 'json' | 'text' | 'env';

/** Detects format from file extension if not explicitly set */
function detectFormat(filePath: string): ExtensionFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.json') return 'json';
  if (ext === '.env' || path.basename(filePath).startsWith('.env')) return 'env';
  return 'text';
}

/** Parses file content by format into a readable string for LLM injection */
function parseContent(raw: string, format: ExtensionFormat, maxLines?: number): string {
  try {
    switch (format) {
      case 'json': {
        const parsed = JSON.parse(raw);
        return JSON.stringify(parsed, null, 2);
      }
      case 'yaml': {
        // Simple YAML-to-readable-text (no dependency needed for basic key:value)
        // We do NOT add a yaml parser dependency — return raw content, LLMs read YAML natively
        return raw.trim();
      }
      case 'env': {
        // Parse KEY=VALUE lines, filter comments/blanks, present as readable pairs
        return raw
          .split('\n')
          .filter(l => l.trim() && !l.trim().startsWith('#'))
          .map(l => l.trim())
          .join('\n');
      }
      case 'text':
      default: {
        // For log files: only last N lines to prevent context overflow
        const lines = raw.split('\n');
        const limit = maxLines ?? 100;
        return lines.slice(-limit).join('\n');
      }
    }
  } catch {
    // If parsing fails, return raw content — better than nothing
    return raw.trim();
  }
}

/**
 * Loads all project extensions for a given operation and returns a formatted
 * markdown string ready to prepend to an LLM prompt.
 *
 * Returns an empty string if no extensions match or files don't exist.
 * Never throws — errors are swallowed with a comment in the output.
 */
export async function loadExtensionsForOperation(
  projectRoot: string,
  config: McpConfig,
  operation: ExtensionOperation
): Promise<string> {
  const extensions = config.projectExtensions ?? [];
  const matching = extensions.filter(e => e.injectInto.includes(operation));
  if (matching.length === 0) return '';

  const MAX_CHARS_PER_EXTENSION = 10_000;
  const blocks: string[] = [];

  for (const ext of matching) {
    const fullPath = path.resolve(projectRoot, ext.path);
    if (!fs.existsSync(fullPath)) {
      blocks.push(
        `### Project Extension: ${ext.name}\n` +
        `⚠️ File not found at ${ext.path} — context unavailable for this extension.\n`
      );
      continue;
    }

    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const format = ext.format ?? detectFormat(ext.path);
      let content = parseContent(raw, format, ext.maxLines);

      // Hard cap to prevent context overflow
      if (content.length > MAX_CHARS_PER_EXTENSION) {
        content = content.slice(0, MAX_CHARS_PER_EXTENSION) +
          `\n... [truncated at ${MAX_CHARS_PER_EXTENSION} chars]`;
      }

      blocks.push(
        `### Project Extension: ${ext.name}\n` +
        `**Context for LLM:** ${ext.description}\n\n` +
        `\`\`\`\n${content}\n\`\`\``
      );
    } catch (err) {
      blocks.push(
        `### Project Extension: ${ext.name}\n` +
        `⚠️ Failed to read ${ext.path}: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  if (blocks.length === 0) return '';
  return `\n\n## Project-Specific Context\n\n${blocks.join('\n\n---\n\n')}`;
}

/**
 * For 'run' operation only: loads 'env' format extensions and returns
 * their key/value pairs as a flat object to inject into subprocess env.
 *
 * Also flattens yaml/json extensions with simple string leaf values.
 */
export async function loadExtensionEnvVars(
  projectRoot: string,
  config: McpConfig
): Promise<Record<string, string>> {
  const extensions = (config.projectExtensions ?? []).filter(e => e.injectInto.includes('run'));
  const result: Record<string, string> = {};

  for (const ext of extensions) {
    const fullPath = path.resolve(projectRoot, ext.path);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const format = ext.format ?? detectFormat(ext.path);

      if (format === 'env') {
        for (const line of raw.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq === -1) continue;
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim();
          result[key] = val;
        }
      } else if (format === 'json') {
        const parsed = JSON.parse(raw);
        // Flatten 1 level of nesting into env var names
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') {
            result[`${ext.name.toUpperCase()}_${k.toUpperCase()}`] = String(v);
          }
        }
      }
      // yaml and text formats are not injected as env vars (no reliable key extraction)
    } catch {
      // Non-fatal — skip this extension
    }
  }

  return result;
}

/**
 * For 'check' operation: returns an array of environment check results
 * for each extension marked with 'check' in injectInto.
 */
export function checkExtensions(
  projectRoot: string,
  config: McpConfig
): Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; fixHint?: string }> {
  const extensions = (config.projectExtensions ?? []).filter(e => e.injectInto.includes('check'));
  return extensions.map(ext => {
    const fullPath = path.resolve(projectRoot, ext.path);
    if (fs.existsSync(fullPath)) {
      return { name: ext.name, status: 'pass', message: `${ext.name} found at ${ext.path}` };
    }
    return {
      name: ext.name,
      status: ext.required ? 'fail' : 'warn',
      message: `${ext.name}: file not found at ${ext.path}`,
      fixHint: `Create or locate the file at: ${ext.path}\nOr update mcp-config.json → projectExtensions → path`
    };
  });
}
```

---

### File 2: Wire into `TestGenerationService.ts`

Locate the method that builds the generation system prompt (returns the prompt string / object sent to LLM). After the existing context is assembled and **before** the return:

```typescript
import { loadExtensionsForOperation } from '../utils/ExtensionLoader.js';

// Inside the generation method, after building existing context:
const extensionContext = await loadExtensionsForOperation(projectRoot, config, 'generate');
systemPrompt += extensionContext;  // append at end of system prompt
```

---

### File 3: Wire into `CodebaseAnalyzerService.ts`

In the `analyze()` method, after the analysis result is assembled and before it is returned:

```typescript
import { loadExtensionsForOperation } from '../utils/ExtensionLoader.js';

// Append extension context to the analysis result's prompt context field
// (or wherever the analyzer builds its LLM prompt string)
const extensionContext = await loadExtensionsForOperation(projectRoot, config, 'analyze');
// Add to the returned analysis summary or injection point used by the tool handler
```

---

### File 4: Wire into `SelfHealingService.ts`

In the method that builds the heal classification prompt, before the classification call:

```typescript
import { loadExtensionsForOperation } from '../utils/ExtensionLoader.js';

const extensionContext = await loadExtensionsForOperation(projectRoot, config, 'heal');
// Prepend to prompt — logs should come BEFORE the test failure output so LLM sees
// "app was crashing" before "element not found"
healPrompt = extensionContext + '\n\n' + healPrompt;
```

---

### File 5: Wire into `TestRunnerService.ts`

In `runTests()`, in the env var injection block (from TASK-21), add extension env vars:

```typescript
import { loadExtensionEnvVars } from '../utils/ExtensionLoader.js';

// After loading .env.{currentEnvironment} vars, also load extension env vars
const extensionEnvVars = await loadExtensionEnvVars(projectRoot, config);
Object.assign(envVarsToInject, extensionEnvVars);  // extension vars can override env file vars
```

---

### File 6: Wire into `EnvironmentCheckService.ts`

In the `check()` method, after the existing checks array is populated:

```typescript
import { checkExtensions } from '../utils/ExtensionLoader.js';

// After all standard checks, add extension checks
const extensionChecks = checkExtensions(projectRoot, config);
checks.push(...extensionChecks);
```

The `check()` method signature needs `config: McpConfig` added — this is already being done as part of TASK-22, so coordinate with that task or do TASK-22 first.

---

### File 7 (NEW): `src/tests/ExtensionLoader.test.ts`

Write tests covering:
- `loadExtensionsForOperation` filters correctly by `injectInto`
- `loadExtensionsForOperation` handles missing files gracefully (no throw)
- JSON format is pretty-printed
- YAML/text formats are returned as-is
- `text` format respects `maxLines` (last N lines only)
- `env` format parses KEY=VALUE correctly, skips comments/blanks
- Content is capped at 10,000 chars and annotated with truncation message
- `loadExtensionEnvVars` returns flat env var map for `'run'` extensions
- `checkExtensions` returns `'fail'` for `required:true` missing files
- `checkExtensions` returns `'warn'` for `required:false` missing files

---

## Done Criteria
- [ ] `npm run build` passes with zero errors
- [ ] `ExtensionLoader.ts` created with all 3 exported functions
- [ ] `loadExtensionsForOperation` wired into TestGenerationService
- [ ] `loadExtensionsForOperation` wired into CodebaseAnalyzerService
- [ ] `loadExtensionsForOperation` wired into SelfHealingService (prepended, not appended)
- [ ] `loadExtensionEnvVars` wired into TestRunnerService (after TASK-21's env injection)
- [ ] `checkExtensions` wired into EnvironmentCheckService
- [ ] `ExtensionLoader.test.ts` written with all listed test cases
- [ ] `npm test` passes with zero failures
- [ ] Change `Status` above to `DONE`
