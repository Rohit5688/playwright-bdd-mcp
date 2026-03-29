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
    /**
     * Full first-time setup. Throws if critical config files already exist.
     */
    setup(projectRoot: string): Promise<SetupResult>;
    /**
     * Safe to run at any time — only generates files that are missing.
     * Never overwrites existing files. Used by repair_project and upgrade_project.
     */
    repairProject(projectRoot: string): Promise<string>;
    private _scaffold;
}
//# sourceMappingURL=ProjectSetupService.d.ts.map