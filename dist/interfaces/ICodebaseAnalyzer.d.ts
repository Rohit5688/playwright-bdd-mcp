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
        architectureNotesPath?: string;
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
        present: boolean;
        files: string[];
        keys: string[];
    };
    npmScripts?: Record<string, string>;
    existingTestData?: {
        payloads: Array<{
            path: string;
            sampledStructure?: string;
        }>;
        fixtures: Array<{
            path: string;
            sampledStructure?: string;
        }>;
    };
    duplicateSteps?: Array<{
        step: string;
        files: string[];
    }>;
    unusedPomMethods?: Array<{
        path: string;
        unusedMethods: string[];
    }>;
    duplicateInstallWarnings?: string[];
    mcpLearnDirectives?: string[];
    detectedPaths: {
        featuresRoot: string;
        stepsRoot: string;
        pagesRoot: string;
        utilsRoot: string;
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