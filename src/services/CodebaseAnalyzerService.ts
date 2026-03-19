import * as fs from 'fs/promises';
import * as path from 'path';
import type { ICodebaseAnalyzer, CodebaseAnalysisResult } from '../interfaces/ICodebaseAnalyzer.js';
import { McpConfigService, DEFAULT_CONFIG } from './McpConfigService.js';

export class CodebaseAnalyzerService implements ICodebaseAnalyzer {
  
  public async analyze(projectRoot: string, customWrapperPackage?: string): Promise<CodebaseAnalysisResult> {
    const result: CodebaseAnalysisResult = {
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
      let featureFiles: string[] = [];
      if (await this.directoryExists(featuresDir)) {
        featureFiles = await this.readAllFiles(featuresDir, '.feature');
        result.existingFeatures = featureFiles.map(f => path.relative(projectRoot, f));
      }

      // 3. Discover Step Definitions
      const stepsDir = path.join(projectRoot, 'step-definitions');
      if (await this.directoryExists(stepsDir)) {
        const files = await this.readAllFiles(stepsDir, '.ts');
        result.existingStepDefinitions = await Promise.all(files.map(async f => {
          const content = await fs.readFile(f, 'utf8');
          return {
            file: path.relative(projectRoot, f),
            steps: this.extractSteps(content)
          };
        }));
      }

      // 4. Discover Page Objects and naive introspection
      const pagesDir = path.join(projectRoot, 'pages');
      let pageFiles: string[] = [];
      if (await this.directoryExists(pagesDir)) {
        pageFiles = await this.readAllFiles(pagesDir, '.ts');
        result.existingPageObjects = await Promise.all(pageFiles.map(async f => {
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
        if (!isInstalled) {
          result.customWrapper.resolutionError = `⚠️ WARNING: The custom wrapper package '${customWrapperPackage}' could not be resolved locally. Ensure it is installed in node_modules, otherwise the AI cannot introspect its APIs.`;
        }
      }

      // 6. Provide recommendation
      if (!result.bddSetup.present) {
        result.recommendation = "Playwright-BDD config not found. You will need to provision standard setup: features/, step-definitions/, pages/, and playwright.config.ts modifications.";
      } else {
        result.recommendation = "Playwright-BDD is present. Reuse existing wrapper base pages and extend Page Object Models.";
      }

    } catch (error: any) {
      console.error(`Error analyzing codebase: ${error.message}`);
    }

    return result;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async readAllFiles(dir: string, extension: string): Promise<string[]> {
    let results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(await this.readAllFiles(fullPath, extension));
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          results.push(fullPath);
        }
      }
    } catch(e) {}
    return results;
  }

  /**
   * Helper that checks array of files to determine naming conventions (PascalCase, kebab-case, snake_case).
   */
  private detectNamingConvention(files: string[], defaultExt: string): string {
    if (!files || files.length === 0 || !files[0]) return `Default (e.g. example${defaultExt})`;
    const nameStr = path.basename(files[0] as string);
    const extIndex = nameStr.indexOf('.');
    const ext = extIndex !== -1 ? nameStr.substring(extIndex) : defaultExt;
    
    if (nameStr.includes('-')) return `kebab-case${ext}`;
    if (nameStr.includes('_')) return `snake_case${ext}`;
    if (/^[A-Z]/.test(nameStr)) return `PascalCase${ext}`;
    return `camelCase${ext}`;
  }

  /**
   * Enhanced regex-based method extraction for TypeScript classes.
   * Gets `methodName(arg1: string, arg2?: number)` signatures.
   */
  private extractPublicMethods(content: string): string[] {
    const methods: string[] = [];
    // Captures the method name in group 1, and the arguments inside the parens in group 2
    const regex = /(?:public\s+)?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (!name) continue;
      const args = (match[2] || '').trim().replace(/\s+/g, ' '); // Normalize newlines in args
      
      // Ignore typical keywords/constructors
      if (['constructor', 'if', 'while', 'for', 'switch', 'catch', 'function'].includes(name)) continue;
      
      methods.push(`${name}(${args})`);
    }
    return methods;
  }
  /**
   * Extracts BDD step patterns from file content (Given, When, Then).
   */
  private extractSteps(fileContent: string): string[] {
    const steps: string[] = [];
    const stepRegex = /(?:Given|When|Then|Step)\s*\(\s*['"`](.*?)['"`]/g;
    let match;
    while ((match = stepRegex.exec(fileContent)) !== null) {
      if (match[1]) steps.push(match[1]);
    }
    return steps;
  }

  /**
   * Attempts to resolve the custom wrapper package (either local relative path or inside node_modules)
   * and extract explicitly defined public methods from its source (.ts) or typing (.d.ts) files.
   */
  private async resolveAndExtractWrapperMethods(projectRoot: string, wrapperPath: string): Promise<string[]> {
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
            if (methods.length > 0) return methods;
            
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
      
    } catch (e) {
      // Silently fail and return empty array if resolution drops, graceful degradation
    }
    return [];
  }
}
