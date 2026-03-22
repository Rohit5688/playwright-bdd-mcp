import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class GooglePage extends BasePage {

  async navigateTo() {
    await this.page.goto('https://www.google.com');
    await this.waitForStable(); // Rule 10 Wait
  }

  async searchFor(term: string) {
    const searchInput = this.page.getByRole('combobox', { name: /search/i });
    await searchInput.fill(term);
    await searchInput.press('Enter');
    await this.page.waitForLoadState('domcontentloaded'); // Rule 10 Wait after transition
  }

  async clickSearchResult(identifier: string) {
    // 1. Try matching by role/name (semantic text) first
    let resultLink = this.page.getByRole('link', { name: new RegExp(identifier, 'i') }).first();
    
    // 2. Fallback: If no match by name, try finding an anchor containing the identifier in its href
    if (await resultLink.count() === 0) {
      // Escape for selector safety if identifier contains special chars
      resultLink = this.page.locator(`a[href*="${identifier.replace(/"/g, '\\"')}"]`).first();
    }

    await expect(resultLink).toBeVisible({ timeout: 10000 });
    await resultLink.scrollIntoViewIfNeeded();
    await resultLink.click();
    await this.page.waitForLoadState('domcontentloaded'); 
  }
}
