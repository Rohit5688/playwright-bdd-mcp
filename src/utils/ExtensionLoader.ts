import * as fs from 'fs';
import * as path from 'path';

export class ExtensionLoader {
  /**
   * Scans a project directory for common configuration files and
   * project-specific extension files listed under `additionalDataPaths`
   * in mcp-config.json. Returns a prompt-injection block, or '' if nothing found.
   *
   * TASK-25: wired into generate, analyze, heal, run, check services.
   */
  public static loadExtensionsForPrompt(projectRoot: string): string {
    const extensionsText: string[] = [];

    // ── 1. Well-known project extension files ─────────────────────────────────
    const wellKnown: Array<{ file: string; label: string }> = [
      { file: 'feature-flags.json',  label: 'FEATURE FLAGS' },
      { file: 'logger-config.json',  label: 'LOGGER CONFIGURATION' },
      { file: 'api-registry.json',   label: 'API REGISTRY' },
    ];

    for (const { file, label } of wellKnown) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        extensionsText.push(`--- ${label} ---\n${JSON.stringify(parsed, null, 2)}`);
      } catch {
        // Corrupted file — skip silently
      }
    }

    // ── 2. User-defined additionalDataPaths from mcp-config.json ──────────────
    const mcpConfigPath = path.join(projectRoot, 'mcp-config.json');
    if (fs.existsSync(mcpConfigPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
        const extra: unknown = cfg.additionalDataPaths;
        if (Array.isArray(extra)) {
          for (const relPath of extra) {
            if (typeof relPath !== 'string') continue;
            const fullPath = path.resolve(projectRoot, relPath);
            if (!fs.existsSync(fullPath)) continue;
            try {
              const raw = fs.readFileSync(fullPath, 'utf8');
              // Try to pretty-print JSON; fall back to raw text
              let display: string;
              try {
                display = JSON.stringify(JSON.parse(raw), null, 2);
              } catch {
                display = raw.slice(0, 2000); // cap raw text at 2KB
              }
              const label = path.basename(relPath).toUpperCase();
              extensionsText.push(`--- ${label} ---\n${display}`);
            } catch {
              // Skip unreadable file
            }
          }
        }
      } catch {
        // mcp-config.json parse error — skip
      }
    }

    if (extensionsText.length === 0) return '';

    return `\n\n=== PROJECT EXTENSIONS ===\n${extensionsText.join('\n\n')}\n==========================`;
  }
}

