/**
 * ProjectMaintenanceService — Phase 24 + Phase 8 Hardening
 *
 * Centralises the logic for upgrading and repairing TestForge projects.
 * - ensureUpToDate(): Auto-called by most tools to keep mcp-config current.
 * - upgradeProject(): Explicit user-triggered upgrade with full dependency update.
 * - repairProject(): Restores missing baseline files without overwriting anything.
 */
export declare class ProjectMaintenanceService {
    private readonly mcpConfig;
    private readonly userStore;
    private readonly envManager;
    private readonly setupService;
    /**
     * Lightweight, idempotent upgrade — called automatically by every tool.
     * Ensures mcp-config, user stores, and env helpers are current.
     */
    ensureUpToDate(projectRoot: string): Promise<string[]>;
    /**
     * Explicit user-triggered upgrade. Updates deps and verifies baseline.
     */
    upgradeProject(projectRoot: string): Promise<string>;
    /**
     * Safe to run at any time — only generates files that are missing.
     * Never overwrites existing files.
     */
    repairProject(projectRoot: string): Promise<string>;
}
//# sourceMappingURL=ProjectMaintenanceService.d.ts.map