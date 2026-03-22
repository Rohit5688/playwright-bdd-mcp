import { expect } from '@playwright/test';
import { BasePage } from '../src/pages/BasePage';

export class LoginPage extends BasePage {
    private readonly usernameInput = this.page.locator('#user-name');
    private readonly passwordInput = this.page.locator('#password');
    private readonly loginButton = this.page.locator('#login-button');

    async navigate() {
        await this.page.goto(process.env.BASE_URL || 'https://www.saucedemo.com/');
        await this.waitForStable();
    }

    async login(user: string) {
        // In a real project, this would use the user-helper to get creds
        await this.usernameInput.fill(user);
        await this.passwordInput.fill('secret_sauce');
        await this.loginButton.click();
    }
}

export class DashboardPage extends BasePage {
    private readonly inventoryList = this.page.locator('.inventory_list');

    async isVisible() {
        await expect(this.inventoryList).toBeVisible();
    }
}
