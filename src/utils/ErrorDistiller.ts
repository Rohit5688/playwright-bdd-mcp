/**
 * ErrorDistiller — strips timestamps, non-critical driver logs, and redundant
 * stack frames from Playwright test output.
 * TASK-54: Returns causal chain: Step → Selector → Root Failure.
 * Applied to run_playwright_test and self_heal_test outputs.
 */

export interface DistilledError {
  /** One-line root cause */
  rootCause: string;
  /** Failing step text from BDD/Playwright */
  failingStep: string | null;
  /** Selector that failed (if identifiable) */
  failingSelector: string | null;
  /** Error type classification */
  errorType: 'locator' | 'timeout' | 'assertion' | 'network' | 'crash' | 'unknown';
  /** Compact causal chain string for tool response */
  causalChain: string;
  /** Cleaned raw output (noise stripped) */
  cleanedOutput: string;
}

/** Lines matching these patterns are dropped as noise. */
const NOISE_PATTERNS = [
  /^\s*at (?:node:|internal\/|packages\/playwright)/,           // Node internals
  /^\s*at Object\.\d+/,
  /^\s*\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+(?:DEBUG|VERBOSE|TRACE)/i, // Timestamps + debug lines
  /^\s*pw:api/,                                                   // Playwright API trace lines
  /^\s*\[(?:chromium|firefox|webkit)\]\s+\[?(?:LOG|DEBUG)\]?/i,  // Browser driver logs
  /^\s*at async (?:Page|Frame|Locator|BrowserType)\./,            // Playwright internals
  /^\s*\[WebServer\]/,
  /^\s*\[vite\]/i,
  /^\s*Using endpoint/,
  /Listing tests:/,
  /Running \d+ test/,
  /^\s*✓|✗|×|✘\s+\d+ms/,  // Test result lines (keep summary, but strip individual pass lines)
];

/** Extract selector from error message */
function extractSelector(text: string): string | null {
  const patterns = [
    /locator\('([^']+)'\)/,
    /getByRole\('([^']+)'\)/,
    /getByTestId\('([^']+)'\)/,
    /getByLabel\('([^']+)'\)/,
    /getByText\('([^']+)'\)/,
    /selector "([^"]+)"/,
    /\[data-testid="([^"]+)"\]/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[0];
  }
  return null;
}

/** Extract failing BDD step from output */
function extractStep(text: string): string | null {
  const m = text.match(/^\s+(Given|When|Then|And|But)\s+.+/m);
  return m ? m[0].trim() : null;
}

/** Classify error type */
function classifyError(text: string): DistilledError['errorType'] {
  if (/TimeoutError|exceeded \d+ms|Timeout|timed out/i.test(text)) return 'timeout';
  if (/net::ERR|net::ERR_|ERR_CONNECTION|fetch failed|ECONNREFUSED/i.test(text)) return 'network';
  if (/expect\(|toHaveText|toBeVisible|toEqual|assertion/i.test(text)) return 'assertion';
  if (/No element found|strict mode violation|resolved to \d+ elements|not found/i.test(text)) return 'locator';
  if (/crashed|SIGKILL|OOM|out of memory/i.test(text)) return 'crash';
  return 'unknown';
}

export class ErrorDistiller {
  /**
   * Distills Playwright test output into a structured causal chain.
   * @param rawOutput - Raw terminal output from run_playwright_test
   * @returns Structured DistilledError with causal chain and cleaned output
   */
  public static distill(rawOutput: string): DistilledError {
    if (!rawOutput || typeof rawOutput !== 'string') {
      return {
        rootCause: 'No output provided',
        failingStep: null,
        failingSelector: null,
        errorType: 'unknown',
        causalChain: 'Step → (unknown) → No output provided',
        cleanedOutput: '',
      };
    }

    // Strip noise line-by-line
    const lines = rawOutput.split('\n');
    const cleanedLines = lines.filter(line => !NOISE_PATTERNS.some(p => p.test(line)));

    // Deduplicate consecutive identical lines (e.g. repeated stack frames)
    const deduped: string[] = [];
    for (const line of cleanedLines) {
      if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
        deduped.push(line);
      }
    }
    const cleanedOutput = deduped.join('\n').trim();

    // Extract root cause: first Error line or first line mentioning "Error"
    const errorLine = cleanedLines.find(l => /Error:|error:/i.test(l) || /^Error\b/.test(l.trim()));
    const rootCause = errorLine?.trim() ?? cleanedLines.find(l => l.trim().length > 0) ?? 'Unknown error';

    const failingStep = extractStep(rawOutput);
    const failingSelector = extractSelector(rawOutput);
    const errorType = classifyError(rawOutput);

    // Build causal chain: Step → Selector → Root Failure
    const stepPart = failingStep ? `Step: ${failingStep}` : 'Step: (unknown)';
    const selectorPart = failingSelector ? `Selector: ${failingSelector}` : 'Selector: (not identified)';
    const rootPart = `Root Failure: ${rootCause.slice(0, 200)}`;
    const causalChain = [stepPart, selectorPart, rootPart].join('\n→ ');

    return { rootCause, failingStep, failingSelector, errorType, causalChain, cleanedOutput };
  }

  /**
   * Returns a compact string suitable for injection into tool responses.
   * Format: causal chain + cleaned output (truncated to 8000 chars).
   */
  public static format(rawOutput: string): string {
    const distilled = ErrorDistiller.distill(rawOutput);
    const MAX_OUTPUT = 8000;
    const outputBlock = distilled.cleanedOutput.length > MAX_OUTPUT
      ? distilled.cleanedOutput.slice(0, MAX_OUTPUT) + '\n... [output truncated by ErrorDistiller]'
      : distilled.cleanedOutput;

    return [
      `🔍 Causal Chain [${distilled.errorType.toUpperCase()}]:`,
      distilled.causalChain,
      '',
      '--- Cleaned Output ---',
      outputBlock,
    ].join('\n');
  }
}
