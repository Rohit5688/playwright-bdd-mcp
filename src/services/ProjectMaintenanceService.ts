import * as path from 'path';
import * as fs from 'fs';
import { McpConfigService } from './McpConfigService.js';
import { UserStoreService } from './UserStoreService.js';
import { EnvManagerService } from './EnvManagerService.js';

/**
 * ProjectMaintenanceService — Phase 24 Enhancement
 *
 * Centralizes the logic for "self-healing" or automatically upgrading projects.
 * Ensures mcp-config.json, user stores, env files, and helpers are current.
 */
export class ProjectMaintenanceService {
  private readonly mcpConfig = new McpConfigService();
  private readonly userStore = new UserStoreService();
  private readonly envManager = new EnvManagerService();

  /**
   * Automatically performs a safe, idempotent upgrade on the project.
   * Called by other tools to ensure the project matches the latest MCP standards.
   */
  public async ensureUpToDate(projectRoot: string): Promise<string[]> {
    const results: string[] = [];
    const root = path.resolve(projectRoot);

    // 1. Read existing config or scaffold new one
    let cfg = this.mcpConfig.read(root);
    
    // Item 4: Record project root if not set
    if (!cfg.projectRoot) {
      cfg.projectRoot = root;
      this.mcpConfig.write(root, { projectRoot: root });
      results.push(`✅ projectRoot set to ${root} in mcp-config.json`);
    }

    // Item 3 & 6: Discovery of existing files
    const rootFiles = fs.readdirSync(root);
    const existingEnv = rootFiles.find((f: string) => f === '.env' || f.startsWith('.env.'));
    const existingPlaywrightConfig = rootFiles.find((f: string) => f.startsWith('playwright.config.'));

    if (existingEnv) {
      results.push(`ℹ️ Existing environment file detected: ${existingEnv}. MCP will reuse it.`);
    } else {
      // 3. Ensure environment-specific .env files
      this.envManager.scaffoldMulti(root, cfg.environments);
      results.push(`✅ Environment-specific .env files scaffolded (none found).`);
    }

    if (existingPlaywrightConfig) {
      results.push(`ℹ️ Existing Playwright config detected: ${existingPlaywrightConfig}. MCP will respect it.`);
    }

    // 2. Ensure/Upgrade mcp-config.json (scaffold is idempotent)
    cfg = this.mcpConfig.scaffold(root);
    results.push(`✅ MCP Config ensured at v${cfg.version}`);

    // 2. Ensure environment-specific user stores (.json)
    this.userStore.scaffold(root, cfg.environments);
    results.push(`✅ User credential stores verified for: ${cfg.environments.join(', ')}`);

    // 4. Regenerate user-helper.ts (to ensure latest types/env logic)
    const storeData = this.userStore.read(root, cfg.currentEnvironment);
    const roles = storeData.exists && storeData.roles.length > 0 ? storeData.roles : ['admin', 'standard', 'readonly'];
    this.userStore.generateUserHelper(root, roles);
    results.push(`✅ test-data/user-helper.ts regenerated with roles: ${roles.join(', ')}.`);

    return results;
  }
}
