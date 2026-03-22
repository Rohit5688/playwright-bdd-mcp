import type { ICodebaseAnalyzer, CodebaseAnalysisResult } from '../interfaces/ICodebaseAnalyzer.js';
export declare class CodebaseAnalyzerService implements ICodebaseAnalyzer {
    analyze(projectRoot: string, customWrapperPackage?: string): Promise<CodebaseAnalysisResult>;
    private fileExists;
    /**
     * Scans upward from the project root to check for duplicate @playwright/test installations.
     * Double installations cause the notorious 'describe() unexpectedly called' error.
     */
    private scanForDuplicatePlaywrightInstallations;
    private directoryExists;
    private readAllFiles;
    /**
     * Helper that checks array of files to determine naming conventions (PascalCase, kebab-case, snake_case).
     */
    private detectNamingConvention;
    /**
     * Enhanced regex-based method extraction for TypeScript classes.
     * Gets `methodName(arg1: string, arg2?: number)` signatures.
     */
    private extractPublicMethods;
    /**
     * Extracts BDD step patterns from file content (Given, When, Then).
     */
    private extractSteps;
    /**
     * Attempts to resolve the custom wrapper package (either local relative path or inside node_modules)
     * and extract explicitly defined public methods from its source (.ts) or typing (.d.ts) files.
     */
    private resolveAndExtractWrapperMethods;
    /**
     * Naively extracts top-level keys or structures from JSON/TS/JS data files.
     * Returns a string summarizing the shape (e.g. "{ id, name, details: { ... } }")
     */
    private extractSampleStructure;
}
//# sourceMappingURL=CodebaseAnalyzerService.d.ts.map