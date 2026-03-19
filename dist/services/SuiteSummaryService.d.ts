export interface ScenarioSummary {
    feature: string;
    tags: string[];
    scenarioCount: number;
    scenarios: string[];
}
export interface SuiteReport {
    projectRoot: string;
    totalFeatures: number;
    totalScenarios: number;
    tagBreakdown: Record<string, number>;
    features: ScenarioSummary[];
    plainEnglishSummary: string;
}
/**
 * SuiteSummaryService — Phase 21A
 *
 * Reads all .feature files in the project and produces a plain-English
 * description of the test suite — useful for non-technical stakeholders
 * and for understanding test coverage at a glance.
 */
export declare class SuiteSummaryService {
    summarize(projectRoot: string): SuiteReport;
    private findFeatureFiles;
    private parseFeatureFile;
    private buildPlainEnglish;
}
//# sourceMappingURL=SuiteSummaryService.d.ts.map