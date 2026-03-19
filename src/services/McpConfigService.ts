import * as fs from 'fs';
import * as path from 'path';

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
}

export const DEFAULT_CONFIG: McpConfig = {
  version: '1.0.0',
  tags: ['@smoke', '@regression', '@e2e'],
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
};

/**
 * McpConfigService — Phase 23
 *
 * Single source of truth for all team-level preferences.
 * Reads mcp-config.json from the project root and provides typed access.
 * Falls back to DEFAULT_CONFIG for any missing keys (safe merging).
 */
export class McpConfigService {
  private readonly CONFIG_FILE = 'mcp-config.json';
  private readonly EXAMPLE_FILE = 'mcp-config.example.json';

  /** Read mcp-config.json, merging with defaults for missing keys */
  public read(projectRoot: string): McpConfig {
    const configPath = path.join(projectRoot, this.CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<McpConfig>;
      return this.merge(DEFAULT_CONFIG, raw);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  /** Write a (partial) config to mcp-config.json — merges with existing */
  public write(projectRoot: string, patch: Partial<McpConfig>): McpConfig {
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
  public scaffold(projectRoot: string, overrides: Partial<McpConfig> = {}): McpConfig {
    const configPath = path.join(projectRoot, this.CONFIG_FILE);
    const examplePath = path.join(projectRoot, this.EXAMPLE_FILE);

    const config: McpConfig = this.merge(DEFAULT_CONFIG, overrides);

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    // Always (re)write the example — it has no secrets
    fs.writeFileSync(examplePath, JSON.stringify(config, null, 2), 'utf-8');

    return config;
  }

  /** Deep merge: override values win, arrays are replaced (not appended) */
  private merge(base: McpConfig, override: Partial<McpConfig>): McpConfig {
    const result = { ...base };
    for (const key of Object.keys(override) as (keyof McpConfig)[]) {
      const val = override[key];
      if (val === undefined) continue;
      if (Array.isArray(val)) {
        (result as any)[key] = val;
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        (result as any)[key] = { ...(base[key] as object), ...(val as object) };
      } else {
        (result as any)[key] = val;
      }
    }
    return result;
  }
}
