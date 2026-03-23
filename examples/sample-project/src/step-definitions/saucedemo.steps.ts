import { createBdd } from 'playwright-bdd';
import { test } from '@playwright/test';
import { SauceDemoPage } from '../pages/SauceDemoPage.js';

const { Given, When, Then } = createBdd();

Given('I am on the SauceDemo login page', async ({ page }) => {
  const sauceDemoPage = new SauceDemoPage(page);
  await sauceDemoPage.navigate();
});

When('I log in with username {string} and password {string}', async ({ page }, username, password) => {
  const sauceDemoPage = new SauceDemoPage(page);
  await sauceDemoPage.login(username, password);
});

Then('I should see the products inventory page', async ({ page }) => {
  const sauceDemoPage = new SauceDemoPage(page);
  await sauceDemoPage.isInventoryVisible();
});
