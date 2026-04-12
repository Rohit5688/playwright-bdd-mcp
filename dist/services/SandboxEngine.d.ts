/**
 * SandboxEngine.ts — Secure V8-Isolated Code Execution for Token Optimization
 *
 * STRATEGY: Instead of the LLM calling 20+ MCP tools (each costing thousands of
 * input/output tokens for schemas and payloads), it writes a small JS script that
 * runs inside a secure sandbox on the MCP server. The script calls server services
 * directly through a thin "forge" API, processes the data locally, and returns
 * ONLY the final result (e.g., a locator string instead of 10,000 lines of DOM).
 *
 * SAFETY: Uses Node's built-in `vm` module with strict contextification.
 * - No access to `require`, `process`, `fs`, `fetch`, `eval`, or `Function`.
 * - Strict timeout enforcement (default 10s).
 * - Fresh context per execution (no state leakage between runs).
 *
 * ZERO BREAKING CHANGES: This is a purely additive feature. All existing tools
 * remain untouched and fully functional. This adds ONE new tool alongside them.
 */
/**
 * Defines the shape of a service method that can be exposed to the sandbox.
 * Each method receives a single JSON-serializable argument and returns a
 * JSON-serializable result (or a Promise of one).
 */
export type SandboxApiMethod = (...args: any[]) => any | Promise<any>;
/**
 * The registry of methods exposed to the sandbox script via `forge.api.*`.
 */
export interface SandboxApiRegistry {
    [methodName: string]: SandboxApiMethod;
}
/**
 * Configuration options for the sandbox execution.
 */
export interface SandboxOptions {
    /** Max execution time in milliseconds. Default: 10000 (10s). */
    timeoutMs?: number;
    /** Maximum memory in MB (advisory — Node vm doesn't enforce hard limits). */
    maxMemoryMb?: number;
}
/**
 * The result returned after executing a sandbox script.
 */
export interface SandboxResult {
    /** Whether the script executed successfully. */
    success: boolean;
    /** The return value of the script (JSON-serializable). */
    result?: any;
    /** Error message if execution failed. */
    error?: string;
    /** Execution duration in milliseconds. */
    durationMs: number;
    /** Console output captured from the sandbox. */
    logs: string[];
}
/**
 * Executes a user-provided script inside a secure, isolated V8 context.
 *
 * The script has access to:
 * - `forge.api.<methodName>(args)` — Calls registered server-side services.
 * - `console.log(...)` — Captured and returned in `SandboxResult.logs`.
 * - Standard JS builtins: JSON, Math, Array, Object, String, Date, Map, Set, etc.
 *
 * The script does NOT have access to:
 * - require, import, process, fs, fetch, eval, Function constructor, or any Node.js globals.
 *
 * @param script The JavaScript code to execute.
 * @param apiRegistry The server-side methods to expose as `forge.api.*`.
 * @param options Execution options (timeout, memory).
 * @returns A `SandboxResult` with the return value, logs, and timing.
 */
export declare function executeSandbox(script: string, apiRegistry: SandboxApiRegistry, options?: SandboxOptions): Promise<SandboxResult>;
//# sourceMappingURL=SandboxEngine.d.ts.map