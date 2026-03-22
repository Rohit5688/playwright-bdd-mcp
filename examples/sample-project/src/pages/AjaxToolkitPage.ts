import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AjaxToolkitPage extends BasePage {

  async navigateDirectly(url: string) {
    await this.page.goto(url);
    await this.waitForStable(); // Rule 10 auto-wait
  }

  async navigateToHTMLEditor() {
    // Assuming a standard dev express sidebar navigation layout
    const htmlEditorLink = this.page.getByRole('link', { name: 'HTMLEditor', exact: true }).first();
    await expect(htmlEditorLink).toBeVisible(); // Web-First assertion Rule 7
    await htmlEditorLink.click();
    await this.page.waitForLoadState('domcontentloaded'); // Rule 10 Transition Rule
  }

  async replaceDemoText(newText: string) {
    // The Ajax HTMLEditor renders its editable area inside a nested <iframe>.
    // We must use Playwright's frameLocator to pierce into the iframe body,
    // then locate the actual <body contenteditable> element inside it.
    // Rule 11: Native Playwright APIs only — no raw page.evaluate().
    const editorFrame = this.page.frameLocator('.ajax__htmleditor_editor_editpanel iframe').first();
    const editableBody = editorFrame.locator('body');

    await editableBody.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.type(newText);

    // Rule 7: Wait for content to settle in the iframe before asserting
    await expect(editableBody).not.toBeEmpty();
  }

  async verifyTextPresent(expectedText: string) {
    // Rule 9: Strict assertion on the INNER editable element inside the iframe
    const editorFrame = this.page.frameLocator('.ajax__htmleditor_editor_editpanel iframe').first();
    const editableBody = editorFrame.locator('body');
    await expect(editableBody).toContainText(expectedText);
  }
}
