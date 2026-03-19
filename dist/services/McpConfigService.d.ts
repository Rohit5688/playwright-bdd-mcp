export interface McpConfig {
    /** Version of the project configuration structure (Phase 24) */
    version: string;
    /** Tags the generation prompt enforces. Override to match your team's taxonomy. */
    tags: string[];
    /** Mapping from logical key names to actual .env variable names */
    envKeys: {
        baseUrl: string;
        [key: string]: string;
    };
    /** Directory layout for the test project */
    dirs: {
        features: string;
        pages: string;
        stepDefinitions: string;
        testData: string;
    };
    /** Browsers to include in playwright.config.ts */
    browsers: Array<'chromium' | 'firefox' | 'webkit'>;
    /** Default Playwright test timeout in milliseconds */
    timeout: number;
    /** Number of Playwright retries on failure */
    retries: number;
    /** Max attempts for the validate_and_write self-healing loop */
    selfHealMaxRetries: number;
    /**
     * How many scenarios must share the same first Given step
     * before a Background: block is auto-generated.
     */
    backgroundBlockThreshold: number;
    /**
     * Auth strategy for the project:
     *  - "none"       → no login step generated
     *  - "users-json" → credentials from test-data/users.{env}.json (recommended)
     *  - "env"        → credentials from .env variables (legacy)
     */
    authStrategy: 'none' | 'users-json' | 'env';
    /** Currently active environment (matches users.{env}.json) */
    currentEnvironment: string;
    /** All supported environments */
    environments: string[];
    /**
     * Optional: package name or relative path to a base Page Object class.
     * Injected into generation context so all new POMs extend it.
     */
    basePageClass?: string;
    /**
     * Load state strategy to use after navigation calls.
     * Defaults to 'networkidle' which works for most SPAs.
     */
    waitStrategy: 'networkidle' | 'domcontentloaded' | 'load';
    /**
     * Maximum time (in ms) for a single test run shell execution (npx bddgen && npx playwright test).
     * If exceeded, the process is killed and a timeout error is returned.
     * Defaults to 120000 (2 minutes). Increase for large test suites.
     */
    testRunTimeout: number;
}
export declare const DEFAULT_CONFIG: McpConfig;
/**
 * McpConfigService — Phase 23
 *
 * Single source of truth for all team-level preferences.
 * Reads mcp-config.json from the project root and provides typed access.
 * Falls back to DEFAULT_CONFIG for any missing keys (safe merging).
 */
export declare class McpConfigService {
    private readonly CONFIG_FILE;
    private readonly EXAMPLE_FILE;
    /** Read mcp-config.json, merging with defaults for missing keys */
    read(projectRoot: string): McpConfig;
    /** Write a (partial) config to mcp-config.json — merges with existing */
    write(projectRoot: string, patch: Partial<McpConfig>): McpConfig;
    /**
     * Creates mcp-config.json with defaults if it doesn't exist.
     * Also creates mcp-config.example.json (safe to commit).
     * Returns the config that was written.
     */
    scaffold(projectRoot: string, overrides?: Partial<McpConfig>): McpConfig;
    /** Deep merge: override values win, arrays are replaced (not appended) */
    private merge;
}
//# sourceMappingURL=McpConfigService.d.ts.map