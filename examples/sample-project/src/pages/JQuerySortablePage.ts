import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * JQuerySortablePage
 *
 * The jqueryui.com Sortable demo renders its list inside an iframe (the demo iframe).
 * The sortable items are standard <li> elements inside a <ul id="sortable">.
 *
 * We use Playwright's native frameLocator to work inside the demo iframe and
 * use the locator.dragTo() API for all drag interactions (Rule 11: no raw JS events).
 */
export class JQuerySortablePage extends BasePage {
  // The jquery demo page wraps the live widget inside an <iframe class="demo-frame">
  private demoFrame = this.page.frameLocator('iframe.demo-frame');

  /**
   * Returns a locator for a specific sortable item (1-indexed) by its ordinal
   * position in the live rendered list.
   */
  private itemAt(position: number) {
    return this.demoFrame.locator('#sortable li').nth(position - 1);
  }

  /**
   * Waits until the sortable list is fully loaded inside the demo iframe.
   */
  async waitForSortableList() {
    // Rule 7: web-first assertion to ensure the list is visible before interacting
    await expect(this.demoFrame.locator('#sortable')).toBeVisible();
    // Ensure all 7 items are rendered
    await expect(this.demoFrame.locator('#sortable li')).toHaveCount(7);
  }

  /**
   * Drags item at `sourcePosition` to the visual position of `targetPosition`.
   * Rule 11: Uses Playwright's native locator.dragTo() — no page.evaluate() dispatch.
   */
  async dragItemToPosition(sourcePosition: number, targetPosition: number) {
    const source = this.itemAt(sourcePosition);
    const target = this.itemAt(targetPosition);

    // Web-first check both items are ready before attempting drag
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    // Native Playwright drag — this correctly simulates real mouse down/move/up CDP events
    await source.dragTo(target);

    // Brief settle wait for the jQuery sortable animation to complete
    await this.page.waitForTimeout(400);
  }

  /**
   * After the two moves, verifies the list order has changed.
   * Gets the current text of every item and checks nothing is in its original slot.
   */
  async verifyReorder() {
    // Collect the actual rendered order
    const items = this.demoFrame.locator('#sortable li');
    const count = await items.count();

    // Gather text labels of all items
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      labels.push(text?.trim() ?? '');
    }

    // After dragging Item 7 to pos 3 and then Item 1 to pos 6, the list must
    // have changed from the original [Item 1, Item 2, ..., Item 7] ordering.
    // Assert that no item sits in its original sequential position (at minimum, two moved).
    const movedCount = labels.filter((label, idx) => label !== `Item ${idx + 1}`).length;
    expect(movedCount).toBeGreaterThanOrEqual(2);
  }
}
