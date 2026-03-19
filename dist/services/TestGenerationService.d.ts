import type { ITestGenerator } from '../interfaces/ITestGenerator.js';
import type { CodebaseAnalysisResult } from '../interfaces/ICodebaseAnalyzer.js';
/**
 * TestGenerationService — Phases 23–31
 *
 * Builds a comprehensive LLM system instruction that governs how the client AI
 * generates Playwright-BDD test suites (Gherkin + Page Objects + Step Definitions).
 *
 * Key responsibilities:
 *  - Injects project context (existing POMs, steps, naming conventions)
 *  - Enforces 19 mandatory rules covering SOLID patterns, API interception,
 *    multi-tab handling, auth fixtures, TypeScript DTOs, and more
 *  - Reads team preferences from mcp-config.json (tags, wait strategy, auth)
 *  - Outputs a structured JSON schema the AI must follow
 */
export declare class TestGenerationService implements ITestGenerator {
    generatePromptInstruction(testDescription: string, projectRoot: string, analysisResult: CodebaseAnalysisResult, customWrapperPackage?: string, baseUrl?: string): Promise<string>;
}
//# sourceMappingURL=TestGenerationService.d.ts.map