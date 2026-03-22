import * as fs from 'fs';
import * as path from 'path';
export const DEFAULT_CONFIG = {
    version: '2.4.0',
    tags: ['@smoke', '@regression', '@e2e', '@a11y'],
    envKeys: { baseUrl: 'BASE_URL' },
    dirs: {
        features: 'features',
        pages: 'pages',
        stepDefinitions: 'step-definitions',
        testData: 'test-data',
    },
    browsers: ['chromium'],
    timeout: 30000,
    retries: 1,
    selfHealMaxRetries: 3,
    backgroundBlockThreshold: 3,
    authStrategy: 'users-json',
    currentEnvironment: 'staging',
    environments: ['local', 'staging', 'prod'],
    waitStrategy: 'networkidle',
    testRunTimeout: 120_000,
    architectureNotesPath: 'docs/mcp-architecture-notes.md',
    additionalDataPaths: [],
    a11yStandards: ['wcag2aa'],
    a11yReportPath: 'test-results/a11y-report.json'
};
/**
 * McpConfigService — Phase 23
 *
 * Single source of truth for all team-level preferences.
 * Reads mcp-config.json from the project root and provides typed access.
 * Falls back to DEFAULT_CONFIG for any missing keys (safe merging).
 */
export class McpConfigService {
    CONFIG_FILE = 'mcp-config.json';
    EXAMPLE_FILE = 'mcp-config.example.json';
    /** Read mcp-config.json, merging with defaults for missing keys */
    read(projectRoot) {
        const configPath = path.join(projectRoot, this.CONFIG_FILE);
        if (!fs.existsSync(configPath)) {
            return { ...DEFAULT_CONFIG };
        }
        try {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            return this.merge(DEFAULT_CONFIG, raw);
        }
        catch {
            return { ...DEFAULT_CONFIG };
        }
    }
    /** Write a (partial) config to mcp-config.json — merges with existing */
    write(projectRoot, patch) {
        const existing = this.read(projectRoot);
        const merged = this.merge(existing, patch);
        const configPath = path.join(projectRoot, this.CONFIG_FILE);
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
        return merged;
    }
    /**
     * Creates mcp-config.json with defaults if it doesn't exist.
     * Also creates mcp-config.example.json (safe to commit).
     * Returns the config that was written.
     */
    scaffold(projectRoot, overrides = {}) {
        const configPath = path.join(projectRoot, this.CONFIG_FILE);
        const examplePath = path.join(projectRoot, this.EXAMPLE_FILE);
        const config = this.merge(DEFAULT_CONFIG, overrides);
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
        // Always (re)write the example — it has no secrets
        fs.writeFileSync(examplePath, JSON.stringify(config, null, 2), 'utf-8');
        return config;
    }
    /** Deep merge: override values win, arrays are replaced (not appended) */
    merge(base, override) {
        const result = { ...base };
        for (const key of Object.keys(override)) {
            const val = override[key];
            if (val === undefined)
                continue;
            if (Array.isArray(val)) {
                result[key] = val;
            }
            else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                result[key] = { ...base[key], ...val };
            }
            else {
                result[key] = val;
            }
        }
        return result;
    }
}
//# sourceMappingURL=McpConfigService.js.map