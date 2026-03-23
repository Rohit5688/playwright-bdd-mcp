import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class JQueryDatePickerPage extends BasePage {
    private readonly datepickerLink = this.page.locator('a:has-text("Datepicker")');
    private readonly displayInlineLink = this.page.locator('a:has-text("Display inline")');
    private readonly demoIframe = this.page.frameLocator('iframe.demo-frame');
    private readonly datepickerDiv = this.demoIframe.locator('#datepicker');
    private readonly prevMonthBtn = this.demoIframe.locator('a.ui-datepicker-prev');
    private readonly nextMonthBtn = this.demoIframe.locator('a.ui-datepicker-next');
    private readonly currentMonthText = this.demoIframe.locator('span.ui-datepicker-month');
    private readonly currentYearText = this.demoIframe.locator('span.ui-datepicker-year');

    constructor(page: Page) {
        super(page);
    }

    async navigateToDatePicker() {
        await this.navigate('https://jqueryui.com/datepicker/');
        await expect(this.datepickerLink).toBeVisible();
    }

    async selectDisplayInline() {
        await this.displayInlineLink.click();
        // Wait for iframe to be updated/visible
        await expect(this.demoIframe.locator('#datepicker')).toBeVisible();
    }

    async selectDate(day: string, month: string, year: string) {
        const targetYear = parseInt(year);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const targetMonthIndex = months.indexOf(month);

        // Function to get current year and month from the UI
        const getCurrentState = async () => {
            const yearText = await this.currentYearText.textContent();
            const monthText = await this.currentMonthText.textContent();
            return {
                year: parseInt(yearText || '0'),
                monthIndex: months.indexOf(monthText || '')
            };
        };

        let currentState = await getCurrentState();

        // Navigate to the correct year
        while (currentState.year !== targetYear) {
            if (currentState.year > targetYear) {
                await this.prevMonthBtn.click();
            } else {
                await this.nextMonthBtn.click();
            }
            currentState = await getCurrentState();
        }

        // Navigate to the correct month
        while (currentState.monthIndex !== targetMonthIndex) {
            if (currentState.monthIndex > targetMonthIndex) {
                await this.prevMonthBtn.click();
            } else {
                await this.nextMonthBtn.click();
            }
            currentState = await getCurrentState();
        }

        // Click the specific day
        const dayLocator = this.demoIframe.locator('a.ui-state-default', { hasText: new RegExp(`^${day}$`) }).first();
        await dayLocator.click();

        // Rule 10: Wait for state to stabilize after interaction
        await this.page.waitForLoadState('networkidle');
    }

    async verifyDateSelected(day: string, month: string, year: string) {
        // Rule 7: Web-first assertions
        await expect(this.currentMonthText).toHaveText(month);
        await expect(this.currentYearText).toHaveText(year);
        
        // In inline datepicker, the selected date has 'ui-state-active' class
        const selectedDay = this.demoIframe.locator('a.ui-state-active');
        await expect(selectedDay).toHaveText(day);

        // Highlight matched values on UI for verification
        await this.highlightElement(this.currentMonthText);
        await this.highlightElement(this.currentYearText);
        await this.highlightElement(selectedDay);
    }




    async takeScreenshot(name: string) {
        await this.page.screenshot({ path: `screenshots/${name}.png` });
    }
}
