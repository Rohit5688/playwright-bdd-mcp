import { createBdd } from 'playwright-bdd';
import { test } from '@playwright/test';
import { LoginPage, DashboardPage } from '../pages/LoginPage.js';

const { Given, When, Then } = createBdd();

Given('I am on the login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
});

When('I login as {string} user', async ({ page }, user: string) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(user);
});

Then('I should see the dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.isVisible();
});
