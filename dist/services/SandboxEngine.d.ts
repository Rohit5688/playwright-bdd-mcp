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
    /** Maximum memory in MB (advisory — Node vm doesn\'t enforce hard limits). */
    maxMemoryMb?: number;
    /**
     * If provided, all `forge.api.readFile`-style paths will be validated to
     * ensure they resolve within this root. Prevents sandbox scripts from
     * reaching outside the project directory.
     */
    projectRoot?: string;
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
 * Validates that a file path resolves within the given project root.
 * Used by sandbox API methods that accept caller-supplied file paths.
 *
 * @param projectRoot Absolute path to the project root.
 * @param filePath    Caller-supplied (possibly relative) file path.
 * @returns           The resolved absolute path.
 * @throws            Error if the resolved path escapes the project root.
 */
export declare function resolveSafePath(projectRoot: string, filePath: string): string;
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