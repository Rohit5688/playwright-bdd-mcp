import { createBdd } from 'playwright-bdd';
import { test, expect } from '@playwright/test';
import { GooglePage } from '../pages/GooglePage.js';
import { AjaxToolkitPage } from '../pages/AjaxToolkitPage.js';

// Rule 1 restriction: Playwright-BDD bindings only
const { Given, When, Then } = createBdd();

// Rule 2 restriction: Absolutely no raw playwright page locators allowed in these wrapper steps
Given('I navigate directly to {string}', async ({ page }, url: string) => {
  const ajaxPage = new AjaxToolkitPage(page);
  await ajaxPage.navigateDirectly(url);
});

Given('I navigate to Google', async ({ page }) => {
  const googlePage = new GooglePage(page);
  await googlePage.navigateTo();
});

When('I search for {string}', async ({ page }, term: string) => {
  const googlePage = new GooglePage(page);
  await googlePage.searchFor(term);
});

When('I open the {string} link from the search results', async ({ page }, linkText: string) => {
  const googlePage = new GooglePage(page);
  await googlePage.clickSearchResult(linkText);
});

When('I navigate to the HTMLEditor section', async ({ page }) => {
  const ajaxPage = new AjaxToolkitPage(page);
  await ajaxPage.navigateToHTMLEditor();
});

Then('I clear the demo text and type {string} in the editor', async ({ page }, text: string) => {
  const ajaxPage = new AjaxToolkitPage(page);
  await ajaxPage.replaceDemoText(text);
});

Then('I verify the text {string} is visible in the editor', async ({ page }, text: string) => {
  const ajaxPage = new AjaxToolkitPage(page);
  await ajaxPage.verifyTextPresent(text);
});
