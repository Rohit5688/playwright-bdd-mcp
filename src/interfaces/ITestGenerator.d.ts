import type { CodebaseAnalysisResult } from "./ICodebaseAnalyzer.js";
export interface GeneratedFile {
    path: string;
    content: string;
}
export interface TestGenerationResult {
    files: GeneratedFile[];
    setupRequired: boolean;
    reusedComponents: string[];
    explanation: string;
}
export interface ITestGenerator {
    /**
     * Generates a context bundle and prompt instruction that the client LLM
     * will use to construct the final Gherkin and Page Objects JSON structure.
     */
    generatePromptInstruction(testDescription: string, projectRoot: string, analysisResult: CodebaseAnalysisResult, customWrapperPackage?: string, baseUrl?: string): Promise<string>;
}
//# sourceMappingURL=ITestGenerator.d.ts.map