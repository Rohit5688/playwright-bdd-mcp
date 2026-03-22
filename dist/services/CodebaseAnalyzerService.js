import * as fs from 'fs/promises';
import * as path from 'path';
import { McpConfigService, DEFAULT_CONFIG } from './McpConfigService.js';
export class CodebaseAnalyzerService {
    async analyze(projectRoot, customWrapperPackage) {
        const result = {
            bddSetup: { present: false },
            existingFeatures: [],
            existingStepDefinitions: [],
            existingPageObjects: [],
            namingConventions: {
                features: 'kebab-case.feature',
                pages: 'PascalCase.ts'
            },
            recommendation: ''
        };
        const mcpConfig = new McpConfigService();
        const config = mcpConfig.read(projectRoot);
        result.mcpConfig = {
            version: config.version || '0.0.0',
            upgradeNeeded: (config.version || '0.0.0') < DEFAULT_CONFIG.version,
            allowedTags: config.tags
        };
        try {
            // 1. Check for Playwright Config
            const configPath = path.join(projectRoot, 'playwright.config.ts');
            const hasConfig = await this.fileExists(configPath);
            if (hasConfig) {
                const configContent = await fs.readFile(configPath, 'utf8');
                result.bddSetup.present = configContent.includes('playwright-bdd');
                result.bddSetup.configFile = 'playwright.config.ts';
            }
            // 2. Discover Features
            const featuresDir = path.join(projectRoot, 'features');
            let featureFiles = [];
            if (await this.directoryExists(featuresDir)) {
                featureFiles = await this.readAllFiles(featuresDir, '.feature');
                result.existingFeatures = featureFiles.map(f => path.relative(projectRoot, f));
            }
            // 3. Discover Step Definitions
            const stepsDir = path.join(projectRoot, 'step-definitions');
            if (await this.directoryExists(stepsDir)) {
                const files = await this.readAllFiles(stepsDir, '.ts');
                result.existingStepDefinitions = await Promise.all(files.map(async (f) => {
                    const content = await fs.readFile(f, 'utf8');
                    return {
                        file: path.relative(projectRoot, f),
                        steps: this.extractSteps(content)
                    };
                }));
            }
            // 4. Discover Page Objects and naive introspection
            const pagesDir = path.join(projectRoot, 'pages');
            let pageFiles = [];
            if (await this.directoryExists(pagesDir)) {
                pageFiles = await this.readAllFiles(pagesDir, '.ts');
                result.existingPageObjects = await Promise.all(pageFiles.map(async (f) => {
                    const content = await fs.readFile(f, 'utf8');
                    const methods = this.extractPublicMethods(content);
                    // Basic custom wrapper check fallback if no explicit package provided
                    if (!customWrapperPackage && path.basename(f) === 'BasePage.ts') {
                        result.customWrapper = {
                            package: 'local BasePage',
                            detectedMethods: methods
                        };
                    }
                    return {
                        path: path.relative(projectRoot, f),
                        publicMethods: methods
                    };
                }));
            }
            // Extract Naming Conventions based on discovered files
            result.namingConventions = {
                features: this.detectNamingConvention(featureFiles, '.feature'),
                pages: this.detectNamingConvention(pageFiles, '.ts')
            };
            // 5. Explicit Custom Wrapper handling
            if (customWrapperPackage) {
                const extractedMethods = await this.resolveAndExtractWrapperMethods(projectRoot, customWrapperPackage);
                const isInstalled = extractedMethods.length > 0;
                result.customWrapper = {
                    package: customWrapperPackage,
                    detectedMethods: isInstalled ? extractedMethods : [],
                    isInstalled
                };
                // Item 11: Create Architecture Notes for current/future runs
                if (isInstalled) {
                    const archNotesPath = config.architectureNotesPath;
                    const fullArchPath = path.resolve(projectRoot, archNotesPath);
                    const archContent = `[MCP ARCHITECTURE NOTES - ITEM 11]
Package: ${customWrapperPackage}
Detected Methods:
- ${extractedMethods.join('\n- ')}

RULES FOR AI:
1. Prefer these library functions over native Playwright APIs.
2. Even with this wrapper, ensure every interaction is within a Page Object Method (POM Enforcement).
`;
                    try {
                        const archDir = path.dirname(fullArchPath);
                        if (!await this.directoryExists(archDir))
                            await fs.mkdir(archDir, { recursive: true });
                        await fs.writeFile(fullArchPath, archContent, 'utf-8');
                        result.customWrapper.architectureNotesPath = archNotesPath;
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        console.warn(`Could not write architecture notes: ${msg}`);
                    }
                }
                if (!isInstalled) {
                    result.customWrapper.resolutionError = `⚠️ WARNING: The custom wrapper package '${customWrapperPackage}' could not be resolved locally. Ensure it is installed in node_modules, otherwise the AI cannot introspect its APIs.`;
                }
            }
            // 6. Discover NPM Scripts
            const pkgPath = path.join(projectRoot, 'package.json');
            if (await this.fileExists(pkgPath)) {
                try {
                    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
                    if (pkg.scripts) {
                        result.npmScripts = pkg.scripts;
                    }
                }
                catch (e) {
                    console.warn('Failed to parse package.json for scripts');
                }
            }
            // 7. Discover existing Env Files
            const rootFiles = await fs.readdir(projectRoot);
            const envFiles = rootFiles.filter(f => f.startsWith('.env') && !f.endsWith('.example'));
            result.envConfig = {
                present: envFiles.length > 0,
                files: envFiles,
                keys: []
            };
            // 8. Discover Test Data & Fixtures (Broad Recursive Scan)
            const dataDirs = [
                path.join(projectRoot, 'fixtures'),
                path.join(projectRoot, 'test-data'),
                path.join(projectRoot, 'payloads'),
                path.join(projectRoot, 'data'),
                path.join(projectRoot, 'mocks'),
                ...(config.additionalDataPaths || []).map(p => path.isAbsolute(p) ? p : path.join(projectRoot, p))
            ];
            result.existingTestData = { payloads: [], fixtures: [] };
            const uniqueFiles = new Set();
            for (const dir of dataDirs) {
                if (await this.directoryExists(dir)) {
                    const files = await this.readAllFiles(dir, ''); // Get all files initially
                    for (const f of files) {
                        if (uniqueFiles.has(f))
                            continue;
                        const ext = path.extname(f);
                        if (!['.json', '.ts', '.js'].includes(ext))
                            continue;
                        const relativePath = path.relative(projectRoot, f);
                        const content = await fs.readFile(f, 'utf8');
                        const sampledStructure = this.extractSampleStructure(content, ext);
                        // Heuristic: if it's in a 'fixtures' dir, count as fixture, else payload
                        if (f.toLowerCase().includes('fixtures')) {
                            result.existingTestData.fixtures.push({ path: relativePath, sampledStructure });
                        }
                        else {
                            result.existingTestData.payloads.push({ path: relativePath, sampledStructure });
                        }
                        uniqueFiles.add(f);
                        // Phase 46.1: @mcp-learn Comment Scanner
                        if (ext === '.ts' || ext === '.js') {
                            const mcpLearnRegex = /\/\/\s*@mcp-learn:\s*(.+?)\s*->\s*(.+)/g;
                            let learnMatch;
                            while ((learnMatch = mcpLearnRegex.exec(content)) !== null) {
                                if (learnMatch[1] && learnMatch[2]) {
                                    if (!result.mcpLearnDirectives)
                                        result.mcpLearnDirectives = [];
                                    result.mcpLearnDirectives.push(`Codebase Rule: When "${learnMatch[1].trim()}" -> Action: ${learnMatch[2].trim()}`);
                                }
                            }
                        }
                    }
                }
            }
            // --- Phase 37.2: Enhanced Codebase Analysis ---
            // Detect Duplicate Steps
            const stepCounts = new Map();
            for (const def of result.existingStepDefinitions) {
                for (const step of def.steps) {
                    if (!stepCounts.has(step))
                        stepCounts.set(step, []);
                    stepCounts.get(step).push(def.file);
                }
            }
            result.duplicateSteps = Array.from(stepCounts.entries())
                .filter(([_, files]) => files.length > 1)
                .map(([step, files]) => ({ step, files: Array.from(new Set(files)) }));
            // Detect Unused POM Methods
            const usedMethods = new Set();
            for (const def of result.existingStepDefinitions) {
                try {
                    const content = await fs.readFile(path.join(projectRoot, def.file), 'utf8');
                    const methodMatch = content.matchAll(/\.([a-zA-Z0-9_]+)\s*\(/g);
                    for (const m of methodMatch) {
                        usedMethods.add(m[1]);
                    }
                }
                catch { }
            }
            result.unusedPomMethods = [];
            for (const po of result.existingPageObjects) {
                const unused = po.publicMethods.filter(signature => {
                    const name = signature.split('(')[0]?.trim();
                    return name && !usedMethods.has(name);
                });
                if (unused.length > 0) {
                    result.unusedPomMethods.push({ path: po.path, unusedMethods: unused });
                }
            }
            // 9. Provide recommendation
            if (!result.bddSetup.present) {
                result.recommendation = "Playwright-BDD config not found. Standard setup needed.";
                if (result.bddSetup.configFile) {
                    result.recommendation += ` (Found existing ${result.bddSetup.configFile} - reuse and modify)`;
                }
            }
            else {
                result.recommendation = "Playwright-BDD is present. Reuse existing wrapper base pages and extend Page Object Models.";
            }
            // 10. Phase 43: Duplicate Installation Guard
            const warnings = await this.scanForDuplicatePlaywrightInstallations(projectRoot);
            if (warnings.length > 0) {
                result.duplicateInstallWarnings = warnings;
                result.recommendation += "\nCRITICAL WARNING: Multiple @playwright/test installations detected. This will cause 'describe() unexpectedly called' errors. You MUST uninstall the duplicates.";
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`Error analyzing codebase: ${msg}`);
        }
        return result;
    }
    async fileExists(filePath) {
        try {
            const stat = await fs.stat(filePath);
            return stat.isFile();
        }
        catch {
            return false;
        }
    }
    /**
     * Scans upward from the project root to check for duplicate @playwright/test installations.
     * Double installations cause the notorious 'describe() unexpectedly called' error.
     */
    async scanForDuplicatePlaywrightInstallations(startDir) {
        const installations = [];
        let currentDir = path.resolve(startDir);
        const rootDir = path.parse(currentDir).root;
        // Safety break at 10 levels deep to prevent infinite loops or sluggish performance
        let depth = 0;
        while (currentDir !== rootDir && depth < 10) {
            const pmPath = path.join(currentDir, 'node_modules', '@playwright', 'test', 'package.json');
            if (await this.fileExists(pmPath)) {
                installations.push(currentDir);
            }
            currentDir = path.dirname(currentDir);
            depth++;
        }
        if (installations.length > 1) {
            return [
                `Duplicate @playwright/test instances found in: ${installations.join(' AND ')}.`,
                `Recommendation: Delete the node_modules in the parent directory or use a singular monorepo root. Double loading breaks test.describe().`
            ];
        }
        return [];
    }
    async directoryExists(dirPath) {
        try {
            const stat = await fs.stat(dirPath);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
    async readAllFiles(dir, extension) {
        let results = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    results = results.concat(await this.readAllFiles(fullPath, extension));
                }
                else if (entry.isFile() && entry.name.endsWith(extension)) {
                    results.push(fullPath);
                }
            }
        }
        catch (e) { }
        return results;
    }
    /**
     * Helper that checks array of files to determine naming conventions (PascalCase, kebab-case, snake_case).
     */
    detectNamingConvention(files, defaultExt) {
        if (!files || files.length === 0 || !files[0])
            return `Default (e.g. example${defaultExt})`;
        const nameStr = path.basename(files[0]);
        const extIndex = nameStr.indexOf('.');
        const ext = extIndex !== -1 ? nameStr.substring(extIndex) : defaultExt;
        if (nameStr.includes('-'))
            return `kebab-case${ext}`;
        if (nameStr.includes('_'))
            return `snake_case${ext}`;
        if (/^[A-Z]/.test(nameStr))
            return `PascalCase${ext}`;
        return `camelCase${ext}`;
    }
    /**
     * Enhanced regex-based method extraction for TypeScript classes.
     * Gets `methodName(arg1: string, arg2?: number)` signatures.
     */
    extractPublicMethods(content) {
        const methods = [];
        // Captures the method name in group 1, and the arguments inside the parens in group 2
        const regex = /(?:public\s+)?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const name = match[1];
            if (!name)
                continue;
            const args = (match[2] || '').trim().replace(/\s+/g, ' '); // Normalize newlines in args
            // Ignore typical keywords/constructors
            if (['constructor', 'if', 'while', 'for', 'switch', 'catch', 'function'].includes(name))
                continue;
            methods.push(`${name}(${args})`);
        }
        return methods;
    }
    /**
     * Extracts BDD step patterns from file content (Given, When, Then).
     */
    extractSteps(fileContent) {
        const steps = [];
        const stepRegex = /(?:Given|When|Then|Step)\s*\(\s*['"`](.*?)['"`]/g;
        let match;
        while ((match = stepRegex.exec(fileContent)) !== null) {
            if (match[1])
                steps.push(match[1]);
        }
        return steps;
    }
    /**
     * Attempts to resolve the custom wrapper package (either local relative path or inside node_modules)
     * and extract explicitly defined public methods from its source (.ts) or typing (.d.ts) files.
     */
    async resolveAndExtractWrapperMethods(projectRoot, wrapperPath) {
        try {
            // 1. Check if it's a local file relative to projectRoot
            const localPath = path.resolve(projectRoot, wrapperPath);
            if (await this.fileExists(localPath)) {
                return this.extractPublicMethods(await fs.readFile(localPath, 'utf8'));
            }
            if (await this.fileExists(localPath + '.ts')) {
                return this.extractPublicMethods(await fs.readFile(localPath + '.ts', 'utf8'));
            }
            // 2. Check if it's in node_modules
            const nodeModulesPath = path.join(projectRoot, 'node_modules', wrapperPath);
            if (await this.directoryExists(nodeModulesPath)) {
                const pkgPath = path.join(nodeModulesPath, 'package.json');
                if (await this.fileExists(pkgPath)) {
                    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
                    const entryPoint = pkg.types || pkg.typings || pkg.main || 'index.js';
                    const entryPath = path.join(nodeModulesPath, entryPoint);
                    if (await this.fileExists(entryPath)) {
                        const content = await fs.readFile(entryPath, 'utf8');
                        let methods = this.extractPublicMethods(content);
                        if (methods.length > 0)
                            return methods;
                        // if entry was a .js file, look for its .d.ts equivalent
                        if (entryPath.endsWith('.js')) {
                            const dtsPath = entryPath.replace(/\.js$/, '.d.ts');
                            if (await this.fileExists(dtsPath)) {
                                return this.extractPublicMethods(await fs.readFile(dtsPath, 'utf8'));
                            }
                        }
                    }
                }
                // Fallback for node_modules: common entry points
                const fallbacks = ['index.d.ts', 'index.ts', 'BasePage.ts', 'BasePage.d.ts'];
                for (const fallback of fallbacks) {
                    const fallbackPath = path.join(nodeModulesPath, fallback);
                    if (await this.fileExists(fallbackPath)) {
                        return this.extractPublicMethods(await fs.readFile(fallbackPath, 'utf8'));
                    }
                }
            }
        }
        catch (e) {
            // Silently fail and return empty array if resolution drops, graceful degradation
        }
        return [];
    }
    /**
     * Naively extracts top-level keys or structures from JSON/TS/JS data files.
     * Returns a string summarizing the shape (e.g. "{ id, name, details: { ... } }")
     */
    extractSampleStructure(content, ext) {
        try {
            if (ext === '.json') {
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    return data.length > 0 ? `Array of: { ${Object.keys(data[0]).join(', ')} }` : '[]';
                }
                return `{ ${Object.keys(data).join(', ')} }`;
            }
            // For TS/JS, look for exported objects or interfaces
            const keysMatch = content.match(/export\s+(?:const|interface|type|let|var)\s+\w+\s*=\s*{([^}]*)}/);
            if (keysMatch && keysMatch[1]) {
                const keys = keysMatch[1].split(',')
                    .map(k => (k.split(':')[0] || '').trim())
                    .filter(k => k && !k.startsWith('//'));
                return `{ ${keys.join(', ')} }`;
            }
            // Fallback: search for property-like patterns
            const props = Array.from(content.matchAll(/['"]?([a-zA-Z0-9_]+)['"]?\s*:/g)).map(m => m[1]);
            const uniqueProps = Array.from(new Set(props)).slice(0, 10);
            return uniqueProps.length > 0 ? `{ ${uniqueProps.join(', ')}, ... }` : 'unknown structure';
        }
        catch {
            return 'structure could not be parsed';
        }
    }
}
//# sourceMappingURL=CodebaseAnalyzerService.js.map