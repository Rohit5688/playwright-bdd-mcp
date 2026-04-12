import { EnvManagerService } from './EnvManagerService.js';
export interface SetupResult {
    projectRoot: string;
    installed: boolean;
    dirsCreated: string[];
    filesCreated: string[];
    envScaffolded: boolean;
    message: string;
}
/**
 * ProjectSetupService — Phase 20D + Phase 8 Hardening
 *
 * Bootstraps a blank directory into a fully configured Playwright-BDD project.
 * Creates folder structure, installs packages, writes playwright.config.ts,
 * and sets up a .env file via EnvManagerService.
 *
 * Single Responsibility: Only does first-time project scaffolding.
 * repairProject() is safe to call on any existing project — it only fills gaps.
 */
export declare class ProjectSetupService {
    private readonly envManager;
    constructor(envManager?: EnvManagerService);
    setup(projectRoot: string): Promise<string>;
    /**
     * Safe to run at any time — only generates files that are missing.
     * Never overwrites existing files. Used by repair_project and upgrade_project.
     */
    repairProject(projectRoot: string): Promise<string>;
    private _scaffold;
    syncConfigSchema(projectRoot: string): string[];
    generateConfigTemplate(projectRoot: string): string;
    scaffoldMcpConfigReference(projectRoot: string): void;
    scaffoldPromptCheatbook(projectRoot: string): void;
    scanConfigureMe(projectRoot: string): string[];
}
//# sourceMappingURL=ProjectSetupService.d.ts.map