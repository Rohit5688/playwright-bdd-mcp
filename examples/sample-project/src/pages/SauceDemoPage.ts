import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class SauceDemoPage extends BasePage {
  private readonly usernameInput = this.page.locator('#user-name');
  private readonly passwordInput = this.page.locator('#password');
  private readonly loginButton = this.page.locator('#login-button');
  private readonly inventoryList = this.page.locator('.inventory_list');

  async navigate() {
    await this.page.goto('https://www.saucedemo.com');
  }

  async login(user: string, pass: string) {
    await this.usernameInput.fill(user);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }

  async isInventoryVisible() {
    await expect(this.inventoryList).toBeVisible();
  }
}
