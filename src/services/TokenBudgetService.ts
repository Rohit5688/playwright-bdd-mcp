/**
 * TokenBudgetService — tracks estimated token consumption per session.
 * TASK-47: heuristic counter (chars ÷ 4), get_token_budget tool, footer injection.
 *
 * Adapted from AppForge TokenBudgetService — no mobile dependencies.
 * Uses char-count estimation: ~4 chars = 1 token (±15% accuracy).
 */
export class TokenBudgetService {
  private static instance: TokenBudgetService;

  /** Accumulated character-estimated tokens this session */
  private sessionTokens: number = 0;

  /** Per-tool breakdown: toolName → { calls, tokens } */
  private toolBreakdown: Map<string, { calls: number; tokens: number }> = new Map();

  /** Warning thresholds (tokens) */
  private readonly WARNING_THRESHOLD = 50_000;
  private readonly CRITICAL_THRESHOLD = 150_000;

  private warningsEmitted: Set<string> = new Set();

  public static getInstance(): TokenBudgetService {
    if (!TokenBudgetService.instance) {
      TokenBudgetService.instance = new TokenBudgetService();
    }
    return TokenBudgetService.instance;
  }

  /** Estimate token count from text (4 chars ≈ 1 token). */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Record a tool call. Call after every tool execution.
   * Returns a one-line footer string for appending to tool responses.
   */
  public trackToolCall(toolName: string, inputText: string, outputText: string): string {
    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);
    const totalTokens = inputTokens + outputTokens;

    this.sessionTokens += totalTokens;

    const existing = this.toolBreakdown.get(toolName) ?? { calls: 0, tokens: 0 };
    this.toolBreakdown.set(toolName, {
      calls: existing.calls + 1,
      tokens: existing.tokens + totalTokens,
    });

    this.checkThresholds();
    return `[Session Cost: ~${this.sessionTokens.toLocaleString()} tokens]`;
  }

  /** Returns a formatted budget report for the get_token_budget tool. */
  public getBudgetReport(): string {
    const sortedTools = [...this.toolBreakdown.entries()]
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 10);

    const statusEmoji =
      this.sessionTokens > this.CRITICAL_THRESHOLD ? '🔴' :
      this.sessionTokens > this.WARNING_THRESHOLD  ? '🟡' : '🟢';

    const lines = [
      `${statusEmoji} Token Budget Report`,
      `Session Total: ${this.sessionTokens.toLocaleString()} tokens (~$${this.estimateCost(this.sessionTokens).toFixed(3)})`,
      ``,
      `Top Token Consumers:`,
      ...sortedTools.map(([name, data]) =>
        `  ${name}: ${data.tokens.toLocaleString()} tokens (${data.calls} calls)`
      ),
    ];
    return lines.join('\n');
  }

  /** Current session token total */
  public getSessionTokens(): number {
    return this.sessionTokens;
  }

  /** Reset (call on new session start) */
  public reset(): void {
    this.sessionTokens = 0;
    this.toolBreakdown.clear();
    this.warningsEmitted.clear();
  }

  private checkThresholds(): void {
    if (this.sessionTokens > this.CRITICAL_THRESHOLD && !this.warningsEmitted.has('critical')) {
      this.warningsEmitted.add('critical');
      console.warn(`[TestForge] 🔴 CRITICAL: ${this.sessionTokens.toLocaleString()} tokens used. Start a new session to control costs.`);
    } else if (this.sessionTokens > this.WARNING_THRESHOLD && !this.warningsEmitted.has('warning')) {
      this.warningsEmitted.add('warning');
      console.warn(`[TestForge] 🟡 WARNING: ${this.sessionTokens.toLocaleString()} tokens used this session.`);
    }
  }

  /** Rough cost estimate (blended ~$6/M tokens). */
  private estimateCost(tokens: number): number {
    return (tokens / 1_000_000) * 6;
  }
}
