import { McpErrors, McpError, McpErrorCode } from '../types/ErrorSystem.js';
import * as path from 'path';
/**
 * SecurityUtils — Phase 35
 *
 * Pure utility functions for defensive security in the MCP server.
 * These are applied at integration points (tool responses, file writes, shell execution)
 * to prevent credential leakage, path traversal, and command injection.
 *
 * Design principles:
 *  - Pure functions with no side effects (easy to test)
 *  - Non-breaking: legitimate inputs pass through unchanged
 *  - Cross-platform: works on both Windows and Unix paths
 */
// ─────────────────────────────────────────────────────
// 1. Response-Level Secret Redaction
// ─────────────────────────────────────────────────────
/**
 * Redaction patterns — each maps a regex to a replacer function.
 * We avoid over-matching by being specific about value boundaries.
 */
const REDACTION_RULES = [
    // Bearer tokens (JWT or opaque)
    { pattern: /Bearer\s+[A-Za-z0-9\-_\.]{20,}/gi, replacer: 'Bearer [REDACTED]' },
    // Common env var assignments with secrets: API_KEY=value, TOKEN=value, SECRET=value
    // Matches: KEY=value (not KEY= which is empty)
    { pattern: /(API_KEY|API_TOKEN|API_SECRET|AUTH_TOKEN|SECRET_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET)\s*=\s*\S+/gi, replacer: '$1=[REDACTED]' },
    // password= style in .env files or logs (value after = until end of line or whitespace)
    { pattern: /(password|passwd|pwd)\s*=\s*(?!\*{3})\S+/gi, replacer: '$1=[REDACTED]' },
    // password: "value" or password: 'value' in JSON/TS source (but NOT password: "***FILL_IN***")
    { pattern: /(password|passwd|pwd)(\s*:\s*)(["'])(?!\*{3}FILL_IN\*{3})([^"']+)\3/gi, replacer: '$1$2$3[REDACTED]$3' },
    // Authorization header values in captured HTTP responses
    { pattern: /(Authorization\s*:\s*)(["']?)(?:Basic|Digest)\s+[A-Za-z0-9+/=]{8,}\2/gi, replacer: '$1$2[REDACTED]$2' },
];
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
export function sanitizeOutput(text) {
    let result = text;
    for (const rule of REDACTION_RULES) {
        result = result.replace(rule.pattern, rule.replacer);
    }
    return result;
}
// ─────────────────────────────────────────────────────
// 2. Project Root Path Guard
// ─────────────────────────────────────────────────────
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
export function validateProjectPath(projectRoot, relativePath) {
    // Normalize the project root to remove trailing slashes and resolve symlinks
    const normalizedRoot = path.resolve(projectRoot);
    // Resolve the full path — this handles '..', '.', and mixed separators
    const resolvedPath = path.resolve(normalizedRoot, relativePath);
    // Ensure the resolved path starts with the project root + path separator
    // (or IS the project root itself)
    if (!resolvedPath.startsWith(normalizedRoot + path.sep) && resolvedPath !== normalizedRoot) {
        throw McpErrors.permissionDenied(resolvedPath, `PATH SECURITY VIOLATION: Resolved path "${resolvedPath}" escapes the project root "${normalizedRoot}".\n` +
            `   The relative path "${relativePath}" contains a traversal or absolute path injection.\n` +
            `   Only paths within the project root are allowed.`);
    }
    return resolvedPath;
}
// ─────────────────────────────────────────────────────
// 3. Shell Argument Sanitization
// ─────────────────────────────────────────────────────
/**
 * Characters that could enable command injection in a shell context.
 * These are stripped from user-supplied test arguments before they
 * are interpolated into the `npx playwright test ...` command.
 */
const DANGEROUS_CHARS = /[;&|`$><\n\r!{}()]/g;
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
export function sanitizeShellArg(arg) {
    return arg.replace(DANGEROUS_CHARS, '').trim();
}
/**
 * Patterns that indicate hardcoded secrets in generated source code.
 * Each rule has a pattern to detect and a safe alternative the LLM should use.
 *
 * Exclusions (not flagged):
 *  - process.env.XXX references (safe)
 *  - getUser('role') calls (safe)
 *  - ***FILL_IN*** placeholders (safe)
 *  - Empty string values like password: '' (test scaffolding)
 *  - Gherkin .feature files (they don't execute code)
 */
const SECRET_AUDIT_RULES = [
    {
        // password: "literal-value" or password = "literal-value" — but NOT process.env, getUser, ***, or empty string
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"](?!\s*['"]|process\.env\.|getUser|\*{3})[^'"]{3,}['"]/gi,
        description: 'Hardcoded password value',
        safeAlternative: "Use getUser('role').password or process.env.PASSWORD"
    },
    {
        // Bearer followed by a literal token string (not a variable)
        pattern: /['"`]Bearer\s+(?![\$\{]|process\.env)[A-Za-z0-9\-_.]{10,}['"`]/gi,
        description: 'Hardcoded Bearer token',
        safeAlternative: 'Use `Bearer ${process.env.API_TOKEN}`'
    },
    {
        // API_KEY: "literal" or token: "literal" — not process.env or template literal
        pattern: /(?:api_key|api_token|auth_token|secret_key|access_key|client_secret)\s*[:=]\s*['"](?!process\.env|\$\{)[A-Za-z0-9\-_.]{8,}['"]/gi,
        description: 'Hardcoded API key or token',
        safeAlternative: 'Use process.env.API_KEY or process.env.API_TOKEN'
    },
    {
        // URLs with embedded credentials: https://user:pass@host
        pattern: /https?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
        description: 'URL with embedded credentials',
        safeAlternative: 'Use process.env.BASE_URL and build auth headers separately'
    },
];
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
export function auditGeneratedCode(files) {
    const violations = [];
    for (const file of files) {
        // Only audit executable code files, not Gherkin features
        if (file.path.endsWith('.feature'))
            continue;
        for (const rule of SECRET_AUDIT_RULES) {
            const matches = file.content.match(rule.pattern);
            if (matches) {
                for (const match of matches) {
                    violations.push(`⚠️ SECRET DETECTED in "${file.path}": ${rule.description}\n` +
                        `   Found: ${match.substring(0, 60)}${match.length > 60 ? '...' : ''}\n` +
                        `   Fix: ${rule.safeAlternative}`);
                }
            }
        }
    }
    return violations;
}
// ─────────────────────────────────────────────────────
// 5. Safe JSON Parse
// ─────────────────────────────────────────────────────
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
export function safeJsonParse(text, label) {
    try {
        return JSON.parse(text);
    }
    catch {
        console.error(`[SecurityUtils] safeJsonParse failed${label ? ` for "${label}"` : ''}: invalid JSON`);
        return null;
    }
}
//# sourceMappingURL=SecurityUtils.js.map