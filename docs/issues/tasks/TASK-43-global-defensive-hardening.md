# TASK-43: Global Defensive Boundary Hardening

**Tier:** 2 (Resilience)  
**Target Files:** `src/index.ts`, `src/services/TestRunnerService.ts`, `src/services/DomInspectorService.ts`

## 1. Description
Following the AppForge stabilization pattern (Commits `c8df84c`, `c49f55a`, `8a67235`), TestForge needs a universal defensive boundary. Every tool handler must be wrapped in a `try/catch` to prevent the session from crashing, and all string operations (like `.toLowerCase()`) must use optional chaining `?.` to prevent null-pointer exceptions from hallucinated LLM inputs.

## 2. Execution Steps
1. **Null-Guard String Operations**: Grep for `.toLowerCase()`, `.trim()`, `.startsWith()` and ensure they are preceded by optional chaining (e.g., `args.platform?.toLowerCase()`).
2. **Global Tool Handler Envelope**: In `src/index.ts`, ensure the `server.setRequestHandler(CallToolRequestSchema, ...)` has a top-level error catcher that serializes the error as a JSON response instead of letting the process exit.
3. **Parse Safeguards**: Wrap all `JSON.parse()` and `XML` parsing logic (in `SelfHealingService` and `DomInspectorService`) in safe wrappers that return an empty object/error state instead of throwing.
4. **Shell Sanitization**: In `TestRunnerService`, ensure all string interpolation in `exec` calls is sanitized for both Windows and Unix environments.

## 3. Exit Criteria
- Crashing inputs from the LLM return a 400-level error description instead of terminating the MCP server.
- No `TypeError: Cannot read properties of undefined` in logs during fuzzy input testing.
