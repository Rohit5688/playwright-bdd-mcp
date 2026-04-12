import { McpErrors, McpError, McpErrorCode } from '../types/ErrorSystem.js';
/**
 * ShellSecurityEngine — validates shell arguments for injection patterns.
 *
 * Ported from AppForge and adapted for TestForge (web/API automation context).
 * Covers the injection risks most relevant to npx/playwright/bddgen invocations.
 *
 * USAGE:
 *   const check = ShellSecurityEngine.validateArgs(args);
 *   if (!check.safe) throw McpErrors.shellInjectionDetected(check.violations[0].pattern);
 *
 *   const pathCheck = ShellSecurityEngine.validateFilePath(filePath);
 *   if (!pathCheck.safe) throw McpErrors.shellInjectionDetected(pathCheck.violations[0].input);
 */

export interface SecurityCheckResult {
  safe: boolean;
  violations: SecurityViolation[];
}

export interface SecurityViolation {
  type: SecurityViolationType;
  /** The matched pattern or metacharacter */
  pattern: string;
  /** The raw input fragment that triggered the violation */
  input: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type SecurityViolationType =
  | 'COMMAND_SUBSTITUTION'   // $() or `` in args
  | 'PIPE_INJECTION'         // | in unexpected position
  | 'REDIRECT_INJECTION'     // > >> < in args
  | 'SEMICOLON_INJECTION'    // ; separating multiple commands
  | 'AMPERSAND_INJECTION'    // & backgrounding or && chaining
  | 'ROOT_PATH_TRAVERSAL'    // ../../../ pattern
  | 'NULL_BYTE'              // \x00 in input
  | 'NEWLINE_INJECTION'      // \n in args
  | 'GLOB_EXPANSION';        // Unintended * or ? in paths

export class ShellSecurityEngine {

  // ─── Core validators ────────────────────────────────────────────────────────

  /**
   * Validates an array of shell arguments.
   * Checks for injection patterns that could break out of argument context.
   * This is defense-in-depth on top of using execFile (which already prevents
   * shell metacharacter interpolation at the OS level).
   */
  static validateArgs(args: string[], toolName?: string): SecurityCheckResult {
    const violations: SecurityViolation[] = [];

    for (const arg of args) {
      violations.push(...this.checkArg(arg));
    }

    // Critical/high severity = reject. Low/medium = warn but allow.
    if (violations.some(v => v.severity === 'critical' || v.severity === 'high')) {
      return { safe: false, violations };
    }

    return { safe: true, violations };
  }

  /**
   * Validates a file path for directory traversal and shell injection.
   * Allows alphanumeric, hyphens, underscores, dots, slashes, and colons (Windows drive letters).
   */
  static validateFilePath(filePath: string, toolName?: string): SecurityCheckResult {
    const violations: SecurityViolation[] = [];

    // Null bytes — always critical
    if (filePath.includes('\0')) {
      violations.push({
        type: 'NULL_BYTE',
        pattern: '\\x00',
        input: filePath,
        severity: 'critical',
      });
    }

    // Directory traversal — blocks ../../etc/passwd style attacks
    if (/\.\.[\\/]/.test(filePath) && !this.isKnownSafePath(filePath)) {
      violations.push({
        type: 'ROOT_PATH_TRAVERSAL',
        pattern: '../',
        input: filePath,
        severity: 'high',
      });
    }

    // Shell metacharacters embedded in paths
    const shellMeta = /[;|&$`<>!{}()*?]/.exec(filePath);
    if (shellMeta) {
      violations.push({
        type: 'COMMAND_SUBSTITUTION',
        pattern: shellMeta[0],
        input: filePath,
        severity: 'critical',
      });
    }

    return { safe: violations.length === 0, violations };
  }

  /**
   * Validates an npm script name.
   * Prevents arbitrary shell commands from being smuggled as a "script name".
   */
  static validateNpmScript(
    scriptName: string,
    allowedScripts: string[] = ['test', 'build', 'lint', 'start', 'dev', 'ci', 'e2e', 'e2e:smoke', 'e2e:regression']
  ): SecurityCheckResult {
    const violations: SecurityViolation[] = [];

    // npm script names are generally short alphanumeric+colon strings
    if (!/^[a-zA-Z0-9:_-]+$/.test(scriptName)) {
      violations.push({
        type: 'COMMAND_SUBSTITUTION',
        pattern: scriptName,
        input: scriptName,
        severity: 'high',
      });
    }

    return { safe: violations.length === 0, violations };
  }

  /**
   * Formats a security check result for error messages.
   */
  static formatViolations(result: SecurityCheckResult): string {
    if (result.safe && result.violations.length === 0) return 'No violations';

    return result.violations
      .map(v => `[${v.severity.toUpperCase()}] ${v.type}: detected '${v.pattern}' in '${v.input.substring(0, 80)}'`)
      .join('\n');
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private static checkArg(arg: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Command substitution: $() or backticks
    if (/\$\(|`/.test(arg)) {
      violations.push({ type: 'COMMAND_SUBSTITUTION', pattern: '$() or ``', input: arg, severity: 'critical' });
    }

    // Semicolon injection — could chain commands
    if (/;/.test(arg)) {
      violations.push({ type: 'SEMICOLON_INJECTION', pattern: ';', input: arg, severity: 'high' });
    }

    // Redirect injection
    if (/[<>]/.test(arg)) {
      violations.push({ type: 'REDIRECT_INJECTION', pattern: '< or >', input: arg, severity: 'high' });
    }

    // Pipe injection — could pipe to any command
    if (/\|/.test(arg)) {
      violations.push({ type: 'PIPE_INJECTION', pattern: '|', input: arg, severity: 'high' });
    }

    // Newline injection — could inject new commands
    if (/[\n\r]/.test(arg)) {
      violations.push({ type: 'NEWLINE_INJECTION', pattern: '\\n', input: arg, severity: 'critical' });
    }

    // Null bytes
    if (/\0/.test(arg)) {
      violations.push({ type: 'NULL_BYTE', pattern: '\\x00', input: arg, severity: 'critical' });
    }

    // Ampersand chaining
    if (/&&|&$/.test(arg)) {
      violations.push({ type: 'AMPERSAND_INJECTION', pattern: '&&', input: arg, severity: 'high' });
    }

    // Glob expansion in paths (medium — warn only)
    if (/[*?{}\[\]]/.test(arg) && arg.includes('/')) {
      violations.push({ type: 'GLOB_EXPANSION', pattern: '*, ?, {}, []', input: arg, severity: 'medium' });
    }

    return violations;
  }

  private static isKnownSafePath(filePath: string): boolean {
    // Relative paths starting with ./ are intentionally relative
    return filePath.startsWith('./') && !filePath.includes('../');
  }
}
