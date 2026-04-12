/**
 * Sanitizes text output before it is returned to the MCP client LLM.
 * Masks secrets, tokens, and credential values while preserving
 * structural information (field names, placeholder values).
 *
 * Safe to call on any string — non-matching text passes through unchanged.
 *
 * @param text - Raw text content (terminal output, JSON, source code, etc.)
 * @returns Text with secret values masked as [REDACTED]
 */
export declare function sanitizeOutput(text: string): string;
/**
 * Validates that a relative file path resolves to a location
 * within the project root directory. Prevents path traversal
 * attacks (e.g., `../../etc/passwd`) and absolute path injection.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param relativePath - Relative file path to validate (e.g., 'features/login.feature')
 * @returns The safe, resolved absolute path
 * @throws Error if the resolved path escapes the project root
 */
export declare function validateProjectPath(projectRoot: string, relativePath: string): string;
/**
 * Sanitizes a user-supplied shell argument string by removing
 * dangerous metacharacters that could enable command injection.
 *
 * Allows safe Playwright CLI flags like --grep, --project, --headed,
 * --workers, --reporter, file paths, and tag expressions.
 *
 * @param arg - Raw argument string from the MCP tool input
 * @returns Sanitized string safe for shell interpolation
 */
export declare function sanitizeShellArg(arg: string): string;
/** Minimal file shape expected by the audit (matches FileWriterService.GeneratedFile) */
export interface AuditableFile {
    path: string;
    content: string;
}
/**
 * Scans LLM-generated source files for hardcoded secrets.
 * Returns a list of human-readable violation descriptions.
 *
 * Skips .feature files (Gherkin text, not executable code).
 * Only audits .ts, .js, and .json files.
 *
 * @param files - Array of files to audit (path + content)
 * @returns Array of violation strings (empty = clean)
 */
export declare function auditGeneratedCode(files: AuditableFile[]): string[];
/**
 * Wraps JSON.parse with try/catch to prevent uncaught SyntaxErrors
 * from crashing tool handlers when parsing user-supplied or external JSON.
 *
 * Returns `null` on parse failure. Callers must handle the null case explicitly.
 *
 * @param text  - Raw JSON string (may be malformed).
 * @param label - Optional label for the error log (helps with debugging).
 * @returns Parsed value, or null if invalid JSON.
 *
 * @example
 * const config = safeJsonParse(rawConfigText, 'mcp-config.json');
 * if (config === null) throw McpErrors.configValidationFailed("mcp-config.json is not valid JSON");
 */
export declare function safeJsonParse<T = unknown>(text: string, label?: string): T | null;
//# sourceMappingURL=SecurityUtils.d.ts.map