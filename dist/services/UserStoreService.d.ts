export interface UserCredential {
    username: string;
    password: string;
    role: string;
    /** Any additional metadata: email, displayName, permissions, etc. */
    [extra: string]: string;
}
export interface UserStore {
    [role: string]: UserCredential;
}
export interface UserStoreReadResult {
    environment: string;
    filePath: string;
    exists: boolean;
    roles: string[];
    users: UserStore;
}
export interface UserStoreWriteResult {
    environment: string;
    filePath: string;
    added: string[];
    skipped: string[];
}
/**
 * UserStoreService — Phase 23
 *
 * Manages environment-specific user credential JSON files.
 *
 * File per environment: test-data/users.{env}.json  (never commit — add to .gitignore)
 * Safe-to-commit copy:  test-data/users.example.json (role keys + empty values)
 *
 * Design principles:
 *  - Never overwrites an existing user's credentials
 *  - Secret placeholders (***) flow into the file so devs know to fill them in
 *  - Generates a typed user-helper.ts into the project so Page Objects can call: getUser('admin')
 */
export declare class UserStoreService {
    private readonly TEST_DATA_DIR;
    private readonly EXAMPLE_FILE;
    private readonly HELPER_FILE;
    private storeFile;
    /** Read the user store for a given environment */
    read(projectRoot: string, environment: string): UserStoreReadResult;
    /**
     * Adds new roles to the user store for an environment.
     * Skips roles already present (never overwrites real credentials).
     * Creates the test-data/ directory and example file if needed.
     */
    addRoles(projectRoot: string, environment: string, roles: string[]): UserStoreWriteResult;
    /**
     * Scaffold default roles (admin, standard, readonly) for each environment.
     * Safe to call multiple times — never overwrites existing entries.
     */
    scaffold(projectRoot: string, environments: string[], initialRoles?: string[]): Record<string, UserStoreWriteResult>;
    /**
     * Generates test-data/user-helper.ts into the project so Page Objects
     * can call: const { username, password } = getUser('admin');
     * Reads from users.{ENV}.json where ENV = process.env.TEST_ENV ?? 'staging'
     */
    generateUserHelper(projectRoot: string, knownRoles: string[]): void;
    /** Keeps users.example.json in sync with all known roles (no credentials) */
    private updateExampleFile;
    /**
     * TASK-15: Hard-reject any credential object that contains API key fields.
     * API keys must be stored via manage_env → .env, never in credential JSON.
     */
    private assertNoApiKeyFields;
    /**
     * TASK-15: Pre-validate that the target credential path is covered by .gitignore
     * before any write occurs. Ensures the file is safe to write credentials.
     * If not yet gitignored, calls ensureGitignore() first.
     */
    private assertPathIsGitignored;
    /**
     * TASK-15: Ensure .env is in .gitignore.
     * Called as a side-effect whenever credentials are written so API key files
     * are always protected even if manage_env hasn't run yet.
     */
    private ensureEnvGitignored;
    /** Adds users.{env}.json entries to .gitignore */
    private ensureGitignore;
}
//# sourceMappingURL=UserStoreService.d.ts.map