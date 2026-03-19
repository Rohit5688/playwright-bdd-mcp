export interface SetupResult {
    projectRoot: string;
    installed: boolean;
    dirsCreated: string[];
    filesCreated: string[];
    envScaffolded: boolean;
    message: string;
}
/**
 * ProjectSetupService — Phase 20D
 *
 * Bootstraps a blank directory into a fully configured Playwright-BDD project.
 * Creates folder structure, installs packages, writes playwright.config.ts,
 * and sets up a .env file via EnvManagerService.
 *
 * Single Responsibility: Only does first-time project scaffolding.
 */
export declare class ProjectSetupService {
    private readonly envManager;
    setup(projectRoot: string): Promise<SetupResult>;
}
//# sourceMappingURL=ProjectSetupService.d.ts.map