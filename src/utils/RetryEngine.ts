/**
 * RetryEngine — exponential back-off with jitter for transient failures.
 *
 * Ported from AppForge and adapted for TestForge (web/Playwright context).
 * Replaces the ErrorSystem.isRetryableError() dependency with a local
 * heuristic until TestForge implements its own ErrorSystem (TASK-50).
 *
 * USAGE:
 *   const result = await withRetry(
 *     () => chromium.launch(),
 *     RetryPolicies.playwrightBrowser
 *   );
 *   const browser = result.value;
 */

// ─── Policy types ─────────────────────────────────────────────────────────────

export interface RetryPolicy {
  /** Maximum number of attempts (including the first call). */
  maxAttempts: number;
  /** Base delay in milliseconds before the first retry. */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds. */
  maxDelayMs: number;
  /** Add ±30% random jitter to prevent thundering-herd on shared CI clusters. */
  jitter: boolean;
  /**
   * Optional callback: decides whether a specific error warrants a retry.
   * Defaults to `isTransientError()` heuristic if omitted.
   */
  retryOn?: (error: Error, attempt: number) => boolean;
  /** Optional callback invoked just before each retry sleep. */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

/** Preset policies for common TestForge operations. */
export const RetryPolicies = {
  /**
   * Playwright browser launch — tolerant of slow first-boot in CI.
   * 3 attempts, 2s base delay (→ 2s, 4s+jitter).
   */
  playwrightBrowser: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    jitter: true,
  } satisfies RetryPolicy,

  /**
   * File write operations — handles EBUSY / EMFILE on Windows.
   * 2 attempts, 500ms base delay.
   */
  fileWrite: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    jitter: false,
  } satisfies RetryPolicy,

  /**
   * External network calls (baseUrl reachability, CI API calls).
   * 5 attempts, 2s base delay with full exponential back-off.
   */
  networkCall: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    jitter: true,
  } satisfies RetryPolicy,
} as const;

// ─── Result type ──────────────────────────────────────────────────────────────

export interface RetryResult<T> {
  value: T;
  /** Total number of attempts made (1 = succeeded first try). */
  attempts: number;
  /** Wall-clock time from first call to resolution. */
  totalDurationMs: number;
}

// ─── Core retry function ──────────────────────────────────────────────────────

/**
 * Executes an async function with exponential back-off retry logic.
 *
 * Non-retryable errors (determined by `policy.retryOn` or heuristic) re-throw
 * immediately on first failure without consuming remaining attempts.
 *
 * @param fn      The async operation to retry.
 * @param policy  Retry configuration (use a preset from `RetryPolicies`).
 * @returns       `RetryResult<T>` containing the resolved value and diagnostics.
 * @throws        The last error if all attempts are exhausted.
 *
 * @example
 * const { value: browser, attempts } = await withRetry(
 *   () => chromium.launch({ headless: true }),
 *   RetryPolicies.playwrightBrowser
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const value = await fn();
      return {
        value,
        attempts: attempt,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isLastAttempt = attempt === policy.maxAttempts;
      if (isLastAttempt) break;

      // Decide whether to retry
      const shouldRetry = policy.retryOn
        ? policy.retryOn(lastError, attempt)
        : isTransientError(lastError);

      if (!shouldRetry) {
        // Non-retryable error — surface it immediately, don't waste time waiting
        throw lastError;
      }

      // Exponential back-off: base * 2^(attempt-1), capped, with optional jitter
      const exponentialDelay = policy.baseDelayMs * Math.pow(2, attempt - 1);
      const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);
      const jitterAmount = policy.jitter ? Math.random() * cappedDelay * 0.3 : 0;
      const delayMs = Math.floor(cappedDelay + jitterAmount);

      policy.onRetry?.(lastError, attempt, delayMs);

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Wraps an async function to always retry using a given policy.
 * Creates a drop-in replacement that is retry-transparent to callers.
 *
 * @example
 * const resilientLaunch = withRetryWrapper(
 *   (opts: LaunchOptions) => chromium.launch(opts),
 *   RetryPolicies.playwrightBrowser
 * );
 * const browser = await resilientLaunch({ headless: true });
 */
export function withRetryWrapper<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  policy: RetryPolicy
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    const result = await withRetry(() => fn(...args), policy);
    return result.value;
  };
}

// ─── Transient error heuristic ────────────────────────────────────────────────

/**
 * Heuristic to classify an error as "transient" (safe to retry).
 *
 * Used as the default `retryOn` predicate when no custom function is provided.
 * Covers common OS, network, and browser ephemeral failures. Non-matching errors
 * (TypeErrors, syntax errors, assertion failures) are treated as permanent.
 *
 * NOTE: When TASK-50 (ErrorSystem) is implemented, this can delegate to
 * `McpError.retryable` — just swap the predicate in `policy.retryOn`.
 */
function isTransientError(err: Error): boolean {
  const msg = err.message?.toLowerCase() ?? '';

  // Node.js file-system transient codes
  if (/\b(ebusy|emfile|enfile|eagain|econnreset|econnrefused|etimedout|epipe)\b/.test(msg)) {
    return true;
  }

  // Playwright transient patterns
  if (/target closed|browser has disconnected|context was destroyed|net::err_/i.test(msg)) {
    return true;
  }

  // HTTP transient status codes embedded in error messages
  if (/\b(429|500|502|503|504)\b/.test(msg)) {
    return true;
  }

  // Generic "timeout" is usually transient
  if (/timeout|timed out/i.test(msg)) {
    return true;
  }

  return false;
}

// ─── Private utilities ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
