import { createBdd } from 'playwright-bdd';
import { JQuerySortablePage } from '../pages/JQuerySortablePage.js';
import { AjaxToolkitPage } from '../pages/AjaxToolkitPage.js';

// playwright-bdd bindings — Rule 1
const { Given, When, Then } = createBdd();

// NOTE: "I navigate directly to {string}" is already defined in ajax-toolkit.steps.ts
// and will be reused automatically by playwright-bdd for this feature (Rule 4 / 3).

When('I drag sortable item {int} to the position of item {int}', async ({ page }, sourcePos: number, targetPos: number) => {
  const sortablePage = new JQuerySortablePage(page);
  // Ensure the list is ready before each drag (Rule 7)
  await sortablePage.waitForSortableList();
  await sortablePage.dragItemToPosition(sourcePos, targetPos);
});

Then('I verify the sortable list has been reordered correctly', async ({ page }) => {
  const sortablePage = new JQuerySortablePage(page);
  await sortablePage.verifyReorder();
});
