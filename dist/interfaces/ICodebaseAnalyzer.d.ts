export interface CodebaseAnalysisResult {
    bddSetup: {
        present: boolean;
        configFile?: string;
    };
    existingFeatures: string[];
    existingStepDefinitions: {
        file: string;
        steps: string[];
    }[];
    existingPageObjects: {
        path: string;
        publicMethods: string[];
    }[];
    customWrapper?: {
        package: string;
        detectedMethods: string[];
        isInstalled?: boolean;
        resolutionError?: string;
    };
    namingConventions: {
        features: string;
        pages: string;
    };
    mcpConfig?: {
        version: string;
        upgradeNeeded: boolean;
        allowedTags: string[];
        backgroundBlockThreshold?: number;
        waitStrategy?: 'networkidle' | 'domcontentloaded' | 'load';
        authStrategy?: 'none' | 'users-json' | 'env';
    };
    userRoles?: {
        environment: string;
        roles: string[];
        helperImport: string;
    };
    envConfig?: {
        keys: string[];
    };
    recommendation: string;
}
export interface ICodebaseAnalyzer {
    /**
     * Analyzes the project directory to find existing Playwright-BDD configuration,
     * features, step definitions, and introspects Page Objects.
     */
    analyze(projectRoot: string, customWrapperPackage?: string): Promise<CodebaseAnalysisResult>;
}
//# sourceMappingURL=ICodebaseAnalyzer.d.ts.map