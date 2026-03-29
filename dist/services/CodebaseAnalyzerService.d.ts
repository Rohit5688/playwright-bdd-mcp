import type { ICodebaseAnalyzer, CodebaseAnalysisResult } from '../interfaces/ICodebaseAnalyzer.js';
export declare class CodebaseAnalyzerService implements ICodebaseAnalyzer {
    analyze(projectRoot: string, customWrapperPackage?: string): Promise<CodebaseAnalysisResult>;
    private fileExists;
    /**
     * BUG-11 FIX: Scans for duplicate @playwright/test installations that cause
     * the 'describe() unexpectedly called' error.
     *
     * PREVIOUS (BROKEN): walked UP the directory tree. In a monorepo this always
     * finds the workspace-root @playwright/test and fires a false-positive warning.
     *
     * FIXED: Scans DOWNWARD — checks depth-2 in node_modules (i.e. a direct
     * dependency that bundled its own @playwright/test copy). This is the only
     * scenario that truly causes loader conflicts, not a shared monorepo install.
     */
    private scanForDuplicatePlaywrightInstallations;
    private directoryExists;
    private readAllFiles;
    /**
     * Helper that checks array of files to determine naming conventions (PascalCase, kebab-case, snake_case).
     */
    private detectNamingConvention;
    private hasClassLocatorsFast;
    /**
     * Enhanced AST-based method extraction for TypeScript classes using ts-morph.
     * Leveraged primarily to resolve custom wrapper packages.
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