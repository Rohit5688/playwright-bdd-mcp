import { Page, expect } from '@playwright/test';
import 'dotenv/config';

export class BasePage {
  constructor(public page: Page) { }


  /**
   * Item 12: Standardized Page Stability Guard.
   * Use this after navigation or tab-switching.
   */
  async waitForStable(selector?: string) {
    await this.page.waitForLoadState('domcontentloaded');
    if (selector) {
      await expect(this.page.locator(selector)).toBeVisible();
    }
  }

  /**
   * Item 13: Advertising & Popup Interceptor.
   * Logic to identify and close intrusive overlays.
   */
  async closePopups() {
    const popupSelectors = [
      '[aria-label="Close"]',
      'button.close',
      '.modal-close',
      '#ad-overlay-close'
    ];
    for (const selector of popupSelectors) {
      const closeBtn = this.page.locator(selector).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  }

  async navigate(path: string) {
    await this.page.goto(path);
    await this.waitForStable();
    await this.closePopups();
  }

  /**
   * Phase 42: Automated Accessibility Scan.
   * Scans the current page for violations against WCAG standards.
   * Note: Requires @axe-core/playwright to be installed.
   */
  async checkAccessibility(scanName: string = 'Page Scan') {
    // Dynamic import to avoid issues if not yet installed in node_modules
    const { AxeBuilder } = await import('@axe-core/playwright');
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2aa', 'wcag21aa', 'wcag2a'])
      .analyze();

    if (results.violations.length > 0) {
      console.error(`[A11Y] Violations found in ${scanName}:`, JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }
  async highlightElement(locator: any) {
    await locator.evaluate((node: HTMLElement) => {
      node.style.border = '3px solid red';
      node.style.backgroundColor = 'yellow';
    });
  }
}
