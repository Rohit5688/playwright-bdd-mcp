import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class SauceLoginPage extends BasePage {
    private readonly usernameInput = this.page.locator('[data-test="username"]');
    private readonly passwordInput = this.page.locator('[data-test="password"]');
    private readonly loginButton = this.page.locator('[data-test="login-button"]');

    async navigate() {
        await this.page.goto('https://www.saucedemo.com/');
        await this.waitForStable();
    }

    async login(user: string, pass: string) {
        await this.usernameInput.fill(user);
        await this.passwordInput.fill(pass);
        await this.loginButton.click();
    }
}

export class SauceInventoryPage extends BasePage {
    private readonly cartBadge = this.page.locator('.shopping_cart_badge');

    async addItemToCart(itemName: string) {
        const itemContainer = this.page.locator('.inventory_item', { hasText: itemName });
        await itemContainer.locator('button').click();
    }

    async verifyCartCount(expected: string) {
        await expect(this.cartBadge).toHaveText(expected);
    }
}
