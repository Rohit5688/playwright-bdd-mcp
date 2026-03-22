export declare class AnalyticsService {
    /**
     * Generates a strict system prompt for Root Cause Analysis of a test failure.
     */
    generateRcaPrompt(errorMessage: string): string;
    /**
     * Reads lcov.info or coverage metrics and generates a strict system prompt
     * instructing the LLM to write missing test vectors.
     */
    analyzeCoverageGaps(projectRoot: string): string;
}
//# sourceMappingURL=AnalyticsService.d.ts.map