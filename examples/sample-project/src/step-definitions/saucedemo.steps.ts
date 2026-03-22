import { createBdd } from 'playwright-bdd';
import { SauceLoginPage, SauceInventoryPage } from '../pages/SauceDemoPage.js';

const { Given, When, Then } = createBdd();

Given('I am on the Saucedemo login page', async ({ page }) => {
    const loginPage = new SauceLoginPage(page);
    await loginPage.navigate();
});

When('I login with standard user', async ({ page }) => {
    const loginPage = new SauceLoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');
});

When('I add {string} to the cart', async ({ page }, itemName: string) => {
    const inventoryPage = new SauceInventoryPage(page);
    await inventoryPage.addItemToCart(itemName);
});

Then('the cart should show {string} item', async ({ page }, expectedCount: string) => {
    const inventoryPage = new SauceInventoryPage(page);
    await inventoryPage.verifyCartCount(expectedCount);
});
