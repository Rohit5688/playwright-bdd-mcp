/**
 * ProjectMaintenanceService — Phase 24 Enhancement
 *
 * Centralizes the logic for "self-healing" or automatically upgrading projects.
 * Ensures mcp-config.json, user stores, env files, and helpers are current.
 */
export declare class ProjectMaintenanceService {
    private readonly mcpConfig;
    private readonly userStore;
    private readonly envManager;
    /**
     * Automatically performs a safe, idempotent upgrade on the project.
     * Called by other tools to ensure the project matches the latest MCP standards.
     */
    ensureUpToDate(projectRoot: string): Promise<string[]>;
}
//# sourceMappingURL=ProjectMaintenanceService.d.ts.map