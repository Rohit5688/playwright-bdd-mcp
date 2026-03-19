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
 */
export declare class FileWriterService {
    private readonly MANIFEST_FILE;
    private loadManifest;
    private saveManifest;
    private sha256;
    /**
     * Writes every file in the array to disk under `projectRoot`.
     * Creates any intermediate directories automatically.
     * Warns if a file was manually modified since the last MCP write.
     * Returns the list of absolute paths written, plus any warnings.
     */
    writeFiles(projectRoot: string, files: GeneratedFile[]): {
        written: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=FileWriterService.d.ts.map