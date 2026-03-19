export interface GeneratedFile {
    path: string;
    content: string;
}
/**
 * FileWriterService
 *
 * Handles writing the LLM-generated JSON file array to the project root on disk.
 * Single Responsibility: Only writes files, does not run tests or analyze code.
 *
 * 18B: Maintains a .mcp-manifest.json to track files written by the MCP.
 * If a file was manually modified since last write, surfaces a warning instead
 * of silently overwriting the human's work.
 *
 * Phase 35: Enforces a directory allow-list and path traversal guard.
 * Only files targeting safe directories can be written by the LLM.
 */
export declare class FileWriterService {
    private readonly MANIFEST_FILE;
    /** Directories that LLM-generated files are allowed to be written into */
    private readonly ALLOWED_DIRS;
    private loadManifest;
    private saveManifest;
    private sha256;
    /**
     * Writes every file in the array to disk under `projectRoot`.
     * Creates any intermediate directories automatically.
     * Warns if a file was manually modified since the last MCP write.
     *
     * Phase 35 Security:
     *  - Validates that every file path stays within projectRoot (no traversal)
     *  - Enforces a directory allow-list (only safe dirs for LLM-generated code)
     *
     * Returns the list of absolute paths written, plus any warnings.
     */
    writeFiles(projectRoot: string, files: GeneratedFile[]): {
        written: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=FileWriterService.d.ts.map