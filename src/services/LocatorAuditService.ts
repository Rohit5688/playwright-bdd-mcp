import * as path from 'path';
import * as fs from 'fs/promises';

export interface LocatorAuditEntry {
  file: string;
  className: string;
  locatorName: string;
  strategy: string;
  selector: string;
  severity: 'ok' | 'warning' | 'critical';
  recommendation: string;
}

export interface LocatorAuditReport {
  totalLocators: number;
  stableCount: number;
  fragileCount: number;
  criticalCount: number;
  entries: LocatorAuditEntry[];
  markdownReport: string;
}

/**
 * LocatorAuditService — Scans Page Object TypeScript files and audits selector strategies.
 *
 * Playwright-specific severity rules:
 * - getByRole / getByText / getByTestId / getByLabel  → ✅ ok (semantic, W3C-aligned)
 * - CSS class selector (.btn, .modal)                 → 🟡 warning (breaks on refactor)
 * - CSS id selector (#submit, #userId)                → 🟡 warning (fragile if IDs not stable)
 * - data-testid attribute selector                    → ✅ ok (explicit testing hook)
 * - XPath (xpath=// or page.locator('//'))            → 🔴 critical (very brittle)
 * - page.$() / page.$$()                             → 🔴 critical (legacy non-recommended API)
 */
export class LocatorAuditService {

  public async audit(projectRoot: string, pagesRoot: string = 'pages'): Promise<LocatorAuditReport> {
    const pagesDir = path.join(projectRoot, pagesRoot);
    const pageFiles = await this.listTsFiles(pagesDir);

    const entries: LocatorAuditEntry[] = [];

    for (const file of pageFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relPath = path.relative(projectRoot, file);

      // BUG-09 FIX: Build a map of class-name → line-range so we attribute locators
      // to the correct owning class. Previously only the first class was returned,
      // causing all locators in multi-class files to be attributed to one class.
      const classRanges = this.extractClassRanges(content);
      const resolveClass = (charIdx: number): string => {
        for (const r of classRanges) {
          if (charIdx >= r.start && charIdx <= r.end) return r.name;
        }
        return classRanges[0]?.name ?? path.basename(file, '.ts');
      };

      const matchedRanges: {start: number, end: number}[] = [];
      const isMatched = (idx: number) => matchedRanges.some(r => idx >= r.start && idx <= r.end);
      const addMatch = (idx: number, length: number) => matchedRanges.push({start: idx, end: idx + length});

      // Pattern 5 (BUG-07 FIX): Class-property stored locators.
      // Previously invisible: private loginBtn = this.page.locator('#btn')
      // These are the most common POM pattern and were entirely missed.
      const propLocatorPattern = /(?:private|protected|public|readonly)\s+(\w+)\s*=\s*this\.page\.(locator|getByRole|getByText|getByTestId|getByLabel|getByPlaceholder|getByAltText|getByTitle)\(\s*['"`](.+?)['"`]/g;
      for (const match of content.matchAll(propLocatorPattern)) {
        if (isMatched(match.index ?? 0)) continue;
        addMatch(match.index ?? 0, match[0].length);
        const [, propName, method, selector] = match;
        entries.push(this.classifyEntry(relPath, resolveClass(match.index ?? 0), `${propName} [prop via ${method}()]`, selector ?? ''));
      }

      // Pattern 4: Detect use of stable getBy* methods — count as ok
      const getByPattern = /\.(getByRole|getByText|getByTestId|getByLabel|getByPlaceholder|getByAltText|getByTitle)\(\s*['"`]?([^'"`\)]*)['"`]?/g;
      for (const match of content.matchAll(getByPattern)) {
        if (isMatched(match.index ?? 0)) continue;
        addMatch(match.index ?? 0, match[0].length);
        const m1 = match[1] ?? '';
        entries.push({
          file: relPath,
          className: resolveClass(match.index ?? 0),
          locatorName: `${m1}()`,
          strategy: 'semantic',
          selector: `[${m1}]`,
          severity: 'ok',
          recommendation: `✅ Stable — ${m1}() is the recommended Playwright locator strategy.`
        });
      }

      // Pattern 3: page.$('selector') — legacy jQuery-style (critical)
      const dollarPattern = /page\.\$\(\s*['"`](.+?)['"`]\s*\)/g;
      for (const match of content.matchAll(dollarPattern)) {
        if (isMatched(match.index ?? 0)) continue;
        addMatch(match.index ?? 0, match[0].length);
        entries.push({
          file: relPath,
          className: resolveClass(match.index ?? 0),
          locatorName: 'page.$()',
          strategy: 'legacy-$',
          selector: match[1] ?? '',
          severity: 'critical',
          recommendation: '🔴 LEGACY — page.$() is deprecated in Playwright. Replace with page.locator() or semantic locators.'
        });
      }

      // Pattern 2: this.page.locator('selector') — when page is a class property
      const thisLocatorPattern = /this\.page\.locator\(\s*['"`](.+?)['"`]\s*\)/g;
      for (const match of content.matchAll(thisLocatorPattern)) {
        if (isMatched(match.index ?? 0)) continue;
        addMatch(match.index ?? 0, match[0].length);
        entries.push(this.classifyEntry(relPath, resolveClass(match.index ?? 0), 'this.page.locator()', match[1] ?? ''));
      }

      // Pattern 1: page.locator('selector') — most common
      const locatorPattern = /page\.locator\(\s*['"`](.+?)['"`]\s*\)/g;
      for (const match of content.matchAll(locatorPattern)) {
        if (isMatched(match.index ?? 0)) continue;
        addMatch(match.index ?? 0, match[0].length);
        entries.push(this.classifyEntry(relPath, resolveClass(match.index ?? 0), 'page.locator()', match[1] ?? ''));
      }
    }

    const stableCount = entries.filter(e => e.severity === 'ok').length;
    const fragileCount = entries.filter(e => e.severity === 'warning').length;
    const criticalCount = entries.filter(e => e.severity === 'critical').length;

    return {
      totalLocators: entries.length,
      stableCount,
      fragileCount,
      criticalCount,
      entries,
      markdownReport: this.generateMarkdownReport(entries, stableCount, fragileCount, criticalCount)
    };
  }

  private classifyEntry(file: string, className: string, locatorName: string, selector: string): LocatorAuditEntry {
    let strategy: string;
    let severity: 'ok' | 'warning' | 'critical';
    let recommendation: string;

    if (selector.startsWith('xpath=') || selector.startsWith('//') || selector.startsWith('(//')) {
      strategy = 'xpath';
      severity = 'critical';
      recommendation = '🔴 BRITTLE — XPath breaks on DOM structure changes. Replace with getByRole(), getByTestId(), or getByLabel().';
    } else if (selector.startsWith('[data-testid=') || selector.includes('data-testid')) {
      strategy = 'data-testid';
      severity = 'ok';
      recommendation = '✅ Stable — data-testid is an explicit testing hook. Prefer page.getByTestId() over raw attribute selector.';
    } else if (selector.startsWith('#')) {
      strategy = 'css-id';
      severity = 'warning';
      recommendation = '🟡 Fragile — ID selectors can change across builds. Prefer getByTestId() or getByRole() with name.';
    } else if (selector.startsWith('.') || /^\w+\.\w+/.test(selector)) {
      strategy = 'css-class';
      severity = 'warning';
      recommendation = '🟡 Fragile — CSS class selectors break on UI framework upgrades. Prefer semantic selectors.';
    } else if (selector.startsWith('text=') || selector.startsWith('has-text=')) {
      strategy = 'text-match';
      severity = 'ok';
      recommendation = '✅ Acceptable — text= is readable. Consider getByText() for better auto-retrying.';
    } else if (selector.startsWith('role=')) {
      strategy = 'aria-role';
      severity = 'ok';
      recommendation = '✅ Stable — ARIA role selectors are W3C-aligned and resilient.';
    } else if (/^[a-z]+$/.test(selector)) {
      strategy = 'tag-name';
      severity = 'warning';
      recommendation = '🟡 Ambiguous — tag-only selectors match too broadly. Add role or attribute qualifier.';
    } else {
      strategy = 'css-other';
      severity = 'warning';
      recommendation = '🟡 Unknown CSS strategy — verify this selector is stable and not implementation-specific.';
    }

    return { file, className, locatorName, strategy, selector, severity, recommendation };
  }

  private generateMarkdownReport(
    entries: LocatorAuditEntry[],
    stableCount: number,
    fragileCount: number,
    criticalCount: number
  ): string {
    const total = entries.length;
    const healthScore = total > 0 ? Math.round((stableCount / total) * 100) : 0;

    const lines: string[] = [
      '# 📊 Playwright Locator Audit Report',
      '',
      '## Summary',
      `| Strategy | Count | Health |`,
      `|----------|-------|--------|`,
      `| Semantic (getBy*, data-testid, role) | ${stableCount} | ✅ Stable |`,
      `| CSS class / ID / tag | ${fragileCount} | 🟡 Fragile |`,
      `| XPath / legacy page.$() | ${criticalCount} | 🔴 Critical |`,
      '',
      `**Total Locators Scanned**: ${total}`,
      `**Health Score**: ${healthScore}% stable`,
      '',
    ];

    const criticals = entries.filter(e => e.severity === 'critical');
    if (criticals.length > 0) {
      lines.push('## 🔴 Critical — XPath & Legacy API (Must Fix)');
      lines.push('');
      lines.push('These locators will break on DOM structure changes or are using deprecated APIs:');
      lines.push('');
      lines.push('| File | Class | Locator API | Selector | Fix |');
      lines.push('|------|-------|-------------|----------|-----|');
      for (const e of criticals) {
        const fix = e.strategy === 'xpath'
          ? '`getByRole()` or `getByTestId()`'
          : '`page.locator(css)`';
        lines.push(`| ${e.file} | ${e.className} | ${e.locatorName} | \`${e.selector.substring(0, 60)}\` | ${fix} |`);
      }
      lines.push('');
    }

    const warnings = entries.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      lines.push('## 🟡 Warnings — Fragile Selectors (Recommended Fix)');
      lines.push('');
      lines.push('| File | Class | Locator API | Strategy | Selector | Recommendation |');
      lines.push('|------|-------|-------------|----------|----------|----------------|');
      for (const e of warnings) {
        lines.push(`| ${e.file} | ${e.className} | ${e.locatorName} | ${e.strategy} | \`${e.selector.substring(0, 40)}\` | ${e.recommendation} |`);
      }
      lines.push('');
    }

    if (stableCount === total && total > 0) {
      lines.push('## ✅ All Clear');
      lines.push(`All ${total} locators use stable, semantic strategies. No action needed.`);
    }

    return lines.join('\n');
  }

  /** BUG-09 FIX: Returns all class name→char-range pairs in the file, not just the first. */
  private extractClassRanges(content: string): Array<{ name: string; start: number; end: number }> {
    const ranges: Array<{ name: string; start: number; end: number }> = [];
    const classPattern = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = classPattern.exec(content)) !== null) {
      // Find the matching closing brace by counting brace depth from match position
      let depth = 0;
      let start = content.indexOf('{', match.index);
      let end = start;
      for (let i = start; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      ranges.push({ name: match[1] ?? 'UnknownClass', start: match.index, end });
    }
    return ranges;
  }

  /** @deprecated Use extractClassRanges instead. Kept for backward compat. */
  private extractClassName(content: string): string | null {
    return this.extractClassRanges(content)[0]?.name ?? null;
  }

  private async listTsFiles(dir: string): Promise<string[]> {
    let results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(await this.listTsFiles(fullPath));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist — return empty
    }
    return results;
  }
}
