import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { EnvManagerService } from './EnvManagerService.js';
const execAsync = promisify(exec);
/**
 * ProjectSetupService — Phase 20D
 *
 * Bootstraps a blank directory into a fully configured Playwright-BDD project.
 * Creates folder structure, installs packages, writes playwright.config.ts,
 * and sets up a .env file via EnvManagerService.
 *
 * Single Responsibility: Only does first-time project scaffolding.
 */
export class ProjectSetupService {
    envManager = new EnvManagerService();
    async setup(projectRoot) {
        const dirsCreated = [];
        const filesCreated = [];
        // 1. Ensure root exists
        if (!fs.existsSync(projectRoot)) {
            fs.mkdirSync(projectRoot, { recursive: true });
        }
        // 2. Create the standard BDD directory structure
        const dirs = ['features', 'pages', 'step-definitions', 'fixtures', 'models'];
        for (const dir of dirs) {
            const fullPath = path.join(projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                dirsCreated.push(dir);
            }
        }
        // 3. Create package.json if it doesn't exist
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            const packageJson = {
                name: path.basename(projectRoot),
                version: '1.0.0',
                type: 'module',
                scripts: {
                    test: 'bddgen && playwright test',
                    'test:smoke': 'bddgen && playwright test --grep @smoke',
                    'test:regression': 'bddgen && playwright test --grep @regression',
                },
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
            filesCreated.push('package.json');
        }
        // 4. Create playwright.config.ts if not present
        const configPath = path.join(projectRoot, 'playwright.config.ts');
        if (!fs.existsSync(configPath)) {
            const configContent = `import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'step-definitions/**/*.ts',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',
    headless: process.env['HEADLESS'] !== 'false',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;
            fs.writeFileSync(configPath, configContent, 'utf-8');
            filesCreated.push('playwright.config.ts');
        }
        // 5. Create a tsconfig.json if not found
        const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) {
            const tsconfig = {
                compilerOptions: {
                    module: 'nodenext',
                    target: 'esnext',
                    moduleResolution: 'nodenext',
                    strict: true,
                    skipLibCheck: true,
                    outDir: 'dist',
                },
                include: ['**/*.ts'],
                exclude: ['node_modules', 'dist'],
            };
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');
            filesCreated.push('tsconfig.json');
        }
        // 6. Install Playwright BDD dependencies
        let installed = false;
        const nodeModulesPath = path.join(projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            try {
                await execAsync('npm install --save-dev @playwright/test playwright-bdd typescript dotenv && npx playwright install chromium --with-deps', {
                    cwd: projectRoot,
                    timeout: 120_000,
                });
                installed = true;
            }
            catch (e) {
                // Non-fatal — report as partial success
                installed = false;
            }
        }
        else {
            installed = true; // node_modules already present
        }
        // 7. Scaffold .env files (local, staging, prod by default for new projects)
        const envEnvs = ['local', 'staging', 'prod'];
        const envResults = this.envManager.scaffoldMulti(projectRoot, envEnvs);
        const envScaffolded = envResults.some(r => r.written.length > 0);
        const message = [
            `✅ Project scaffolded at ${projectRoot}`,
            dirsCreated.length > 0 ? `\nDirectories created: ${dirsCreated.join(', ')}` : '',
            filesCreated.length > 0 ? `\nFiles created: ${filesCreated.join(', ')}` : '',
            installed ? '\n✅ npm packages installed (Playwright + playwright-bdd + TypeScript + dotenv)' : '\n⚠️ Package install skipped (node_modules already present or install failed)',
            envScaffolded ? '\n✅ .env scaffolded with default keys' : '\n~ .env already exists, no changes made',
            '\n\n🚀 NEXT STEPS:',
            '  1. Open .env and replace ***FILL_IN*** values with real credentials.',
            '  2. Update BASE_URL in .env to your application URL.',
            '  3. Ask me to generate your first test: "generate a test for [your scenario]"',
            '  4. Or run: npx bddgen && npx playwright test',
        ].filter(Boolean).join('');
        return { projectRoot, installed, dirsCreated, filesCreated, envScaffolded, message };
    }
}
//# sourceMappingURL=ProjectSetupService.js.map