import { McpErrors, McpError, McpErrorCode } from '../types/ErrorSystem.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { GeneratedFile } from './FileWriterService.js';

const execFileAsync = promisify(execFile);

/**
 * StagingService
 * 
 * Implements atomic staging (Task-44). Before any AI-generated files are 
 * written to the actual project root, they are written to a temporary directory
 * inside OS tmpdir and validated with tsc. 
 * If validation fails, the project is never touched.
 */
export class StagingService {
  /**
   * Stages files in os.tmpdir and validates them using tsc --noEmit.
   * Returns the path to the staging directory if successful.
   * Throws an error with details if validation fails.
   */
  public async stageAndValidate(projectRoot: string, files: GeneratedFile[]): Promise<string> {
    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-staging-'));

    try {
      // 1. Write the files to the staging directory
      for (const file of files) {
        const fullPath = path.join(stagingDir, file.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }

      // 2. Validate TypeScript if there are .ts files
      const tsFiles = files.filter(f => f.path.endsWith('.ts'));
      if (tsFiles.length > 0) {
        // TF-CROSS-02 FIX: Generate a portable tsconfig that extends the user's project
        const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
        const hasTsConfig = fs.existsSync(tsconfigPath);

        let targetTsconfigPath = '';

        if (hasTsConfig) {
          const relativeExtends = path.relative(stagingDir, tsconfigPath).replace(/\\/g, '/');
          const relativeRoot = path.relative(stagingDir, projectRoot).replace(/\\/g, '/') || '.';
          const stagingTsconfig = {
            extends: relativeExtends,
            compilerOptions: {
              baseUrl: relativeRoot,
              rootDir: relativeRoot,
              noEmit: true
            },
            include: [
              '**/*.ts',
              `${relativeRoot}/**/*.ts`
            ],
            exclude: [
              `${relativeRoot}/node_modules`,
              `${relativeRoot}/.mcp-staging` // TestForge `.mcp-staging` path exclusion just in case
            ]
          };
          targetTsconfigPath = path.join(stagingDir, 'tsconfig.json');
          fs.writeFileSync(targetTsconfigPath, JSON.stringify(stagingTsconfig, null, 2), 'utf-8');
        }

        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        try {
          if (hasTsConfig) {
            await execFileAsync(npxCmd, ['tsc', '--noEmit', '--project', targetTsconfigPath], {
              cwd: projectRoot // Execute from project root so node_modules resolve
            });
          } else {
            const filePaths = tsFiles.map(f => path.join(stagingDir, f.path));
            await execFileAsync(npxCmd, [
              'tsc',
              '--noEmit',
              '--strict',
              '--esModuleInterop',
              '--skipLibCheck',
              ...filePaths
            ], {
              cwd: projectRoot
            });
          }
        } catch (error: any) {
          const stderr = error.stderr || error.stdout || error.message;
          const errors = stderr
            .split('\n')
            .filter((line: string) => line.includes('error TS') || (line.trim() !== '' && !line.includes('npm')))
            .slice(0, 15);
          throw new McpError('TypeScript compilation failed in staging:\n' + errors.join('\n'), McpErrorCode.TS_COMPILE_FAILED);
        }
      }

      return stagingDir;
    } catch (e) {
      // Clean up on failure
      this.cleanup(stagingDir);
      throw e;
    }
  }

  public cleanup(stagingDir: string) {
    if (stagingDir && fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch (e) { }
    }
  }
}
