export interface EnvEntry {
    key: string;
    value: string;
}
export interface EnvReadResult {
    keys: string[];
    values: Record<string, string>;
    envFilePath: string;
    exists: boolean;
}
export interface EnvWriteResult {
    written: string[];
    skipped: string[];
    envFilePath: string;
}
/**
 * EnvManagerService — Phase 19
 *
 * Reads, writes, and scaffolds .env files for test projects.
 * Design principles:
 *   - Never overwrite a value that already exists (unless explicitly told to)
 *   - Never log or expose secret placeholder values (***) in write output
 *   - Creates .env.example alongside .env so teams can track required keys safely
 *   - Adds .env to .gitignore automatically to prevent accidental credential commits
 */
export declare class EnvManagerService {
    private readonly ENV_FILE;
    private readonly ENV_EXAMPLE_FILE;
    private readonly GITIGNORE_FILE;
    private readonly SECRET_PLACEHOLDER;
    /** Reads a specific .env file and returns all key/value pairs. Default is '.env' */
    read(projectRoot: string, envName?: string): EnvReadResult;
    /**
     * Upserts keys into a specific .env file.
     * - Skips keys whose value starts with *** (they are secrets, human must fill in)
     * - Skips keys already present in .env unless the current value is a placeholder
     * - Updates .env.example with all keys (values redacted to their type for transparency)
     */
    write(projectRoot: string, entries: EnvEntry[], envName?: string, overwrite?: boolean): EnvWriteResult;
    /**
     * Scaffolds environment-specific .env files (e.g. .env.staging).
     * Safe and additive.
     */
    scaffoldMulti(projectRoot: string, envs: string[]): EnvWriteResult[];
    /**
     * Scaffolds a fresh .env file with sensible BDD defaults.
     */
    scaffold(projectRoot: string): EnvWriteResult;
    /** Serializes the key-value map back to .env file format */
    private persistEnvFile;
    /** Creates/updates .env.example with all keys but redacted values */
    private updateEnvExample;
    /** Ensures the env file is listed in .gitignore */
    private ensureGitignore;
}
//# sourceMappingURL=EnvManagerService.d.ts.map