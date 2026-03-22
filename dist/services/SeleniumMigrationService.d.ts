export declare class SeleniumMigrationService {
    private configService;
    constructor();
    /**
     * Generates a strict set of system instructions for the LLM to migrate legacy Selenium code.
     * This handles the "AST/Regex" mapping heuristically via the LLM context capability.
     */
    generateMigrationPrompt(projectRoot: string, legacyCode: string, sourceDialect: string, codebaseContext: any, memoryPrompt?: string): string;
}
//# sourceMappingURL=SeleniumMigrationService.d.ts.map