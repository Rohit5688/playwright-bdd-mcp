/**
 * HeuristicMatcher
 *
 * Finds the best near-match for a failed selector or element identifier
 * using a Longest Common Subsequence (LCS) similarity score.
 * Used by DnaTrackerService before falling back to LLM healing.
 */

export interface MatchCandidate {
  key: string;
  score: number; // 0..1
}

export class HeuristicMatcher {

  /**
   * Computes the LCS length of two strings.
   */
  private static lcsLength(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    // Use 1-D rolling array to stay O(m*n) time, O(n) space
    let prev = new Array<number>(n + 1).fill(0);
    let curr = new Array<number>(n + 1).fill(0);
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        curr[j] = a[i - 1] === b[j - 1]
          ? (prev[j - 1] ?? 0) + 1
          : Math.max(prev[j] ?? 0, curr[j - 1] ?? 0);
      }
      prev = curr;
      curr = new Array<number>(n + 1).fill(0);
    }
    return prev[n] ?? 0;
  }

  /**
   * Returns similarity score 0..1 between two strings using LCS.
   */
  public static similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const lcs = HeuristicMatcher.lcsLength(a.toLowerCase(), b.toLowerCase());
    return (2 * lcs) / (a.length + b.length);
  }

  /**
   * Finds the best candidates from `pool` that match `query`.
   * Returns results sorted by score descending; only results above `threshold`.
   */
  public static findBestMatches(
    query: string,
    pool: string[],
    threshold = 0.4,
    topN = 5
  ): MatchCandidate[] {
    if (!query || pool.length === 0) return [];

    return pool
      .map(key => ({ key, score: HeuristicMatcher.similarity(query, key) }))
      .filter(c => c.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }
}
