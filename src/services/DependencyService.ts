import * as fs from 'fs';
import * as path from 'path';

export interface DependencyAnalysisResult {
  hasPlaywright: boolean;
  hasPlaywrightBdd: boolean;
  hasCucumber: boolean;
  frameworkDetected: string;
  implicitFrameworkDetected: boolean;
  transitiveDeps: string[];
}

/**
 * DependencyService — parses package-lock.json/yarn.lock/package.json
 * and detects implicit frameworks structurally when package manifests might be stale.
 * Part of TASK-71.
 */
export class DependencyService {
  /**
   * Attempts to parse the package manager lockfile to find transitive deps or key deps
   */
  public parseDependencies(projectRoot: string): DependencyAnalysisResult {
    const pkgPath = path.join(projectRoot, 'package.json');
    let hasPlaywright = false;
    let hasPlaywrightBdd = false;
    let hasCucumber = false;
    const transitiveDeps: string[] = [];

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps['@playwright/test']) hasPlaywright = true;
        if (allDeps['playwright-bdd']) hasPlaywrightBdd = true;
        if (allDeps['@cucumber/cucumber']) hasCucumber = true;
      } catch { }
    }

    // Try to glean from lock files if needed, but for frameworks direct deps are usually enough
    const lockPath = path.join(projectRoot, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        if (lock.packages) {
          if (lock.packages['node_modules/@playwright/test']) hasPlaywright = true;
          if (lock.packages['node_modules/playwright-bdd']) hasPlaywrightBdd = true;
        }
      } catch { }
    }

    return {
      hasPlaywright,
      hasPlaywrightBdd,
      hasCucumber,
      frameworkDetected: hasPlaywrightBdd ? 'playwright-bdd' : (hasPlaywright ? 'playwright' : 'unknown'),
      implicitFrameworkDetected: false,
      transitiveDeps
    };
  }

  /**
   * ImportFingerprinter: structurally detects implicit frameworks
   * For example, finding `defineBddConfig` in playwright.config.ts means it's playwright-bdd
   * even if package.json has weird caching issues.
   */
  public detectImplicitFrameworks(projectRoot: string, initialAnalysis: DependencyAnalysisResult): DependencyAnalysisResult {
    const result = { ...initialAnalysis };

    // Search common config files for framework fingerprints
    const playwrightConfigPath = path.join(projectRoot, 'playwright.config.ts');
    
    if (fs.existsSync(playwrightConfigPath)) {
      const configContent = fs.readFileSync(playwrightConfigPath, 'utf-8');
      
      // Implicitly detect playwright-bdd
      if (configContent.includes('defineBddConfig')) {
        result.hasPlaywrightBdd = true;
        result.hasPlaywright = true;
        
        if (result.frameworkDetected !== 'playwright-bdd') {
           result.frameworkDetected = 'playwright-bdd';
           result.implicitFrameworkDetected = true;
        }
      }
    }

    return result;
  }
}
