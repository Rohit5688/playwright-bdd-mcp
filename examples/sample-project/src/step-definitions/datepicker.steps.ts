import { createBdd } from 'playwright-bdd';
import { test, expect } from '@playwright/test';
import { JQueryDatePickerPage } from '../pages/JQueryDatePickerPage.js';

const { Given, When, Then } = createBdd();

Given('I am on the jQuery UI Datepicker page', async ({ page }) => {
    const datePickerPage = new JQueryDatePickerPage(page);
    await datePickerPage.navigateToDatePicker();
});

When('I select "Display inline" type of date picker', async ({ page }) => {
    const datePickerPage = new JQueryDatePickerPage(page);
    await datePickerPage.selectDisplayInline();
});

When('I choose date {string} {string} {string} in the date picker', async ({ page }, day, month, year) => {
    const datePickerPage = new JQueryDatePickerPage(page);
    await datePickerPage.selectDate(day, month, year);
});

Then('I validate that {string} {string} {string} is selected', async ({ page }, day, month, year) => {
    const datePickerPage = new JQueryDatePickerPage(page);
    await datePickerPage.verifyDateSelected(day, month, year);
});

Then('I take a screenshot as {string}', async ({ page }, screenshotName) => {
    const datePickerPage = new JQueryDatePickerPage(page);
    await datePickerPage.takeScreenshot(screenshotName);
});
