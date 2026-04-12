# Detailed Selenium to Playwright-BDD Migration Guide

Porting a legacy Selenium WebDriver repository (Java, Python, C#) to modern Playwright-BDD is notoriously difficult because Playwright uses asynchronous, stateless locators, while Selenium uses synchronous, stateful WebElements. 

The Playwright-BDD MCP Server solves this using a **Hybrid AST/Regex Heuristics Engine**. By leveraging the \`migrate_test\` tool, the AI acts as a translation compiler that understands chronological flow paradigms, not just 1-to-1 syntax mapping.

---

## 🚀 How to Start a Migration

You do **not** need to manually convert files line-by-line. Instead, you provide the AI with your legacy source code, and instruct it to use the MCP translation engine.

### Prerequisites (What you should provide)
1. **The Legacy Source Code**: A `.java` or `.py` file containing the legacy Page Object or `@Test` script.
2. **The Target Directory**: Where in your current project the new files should be saved (e.g., `src/pages/` and `features/`).

### Recommended Workflow Prompts

**Scenario A: Migrating a single Page Object**
> "I want to migrate my old Java Selenium Page Object. Here is the code: [paste code]. Please run the `migrate_test` tool with `sourceDialect: java` and rewrite this as a TypeScript Playwright POM."

**Scenario B: Procedural Deconstruction (Test Script to POM + BDD)**
> "Here is a massive standalone Python Selenium script that tests the checkout flow: [paste code]. Pass this to the `migrate_test` tool. Deconstruct it: extract the UI actions into a new `CheckoutPage.ts` Page Object, and generate the corresponding `checkout.feature` Gherkin file."

---

## 🧠 What the Tool Offers (Engine Capabilities)

The `migrate_test` tool enforces strict architectural transformations. When you call it, it injects a rigid system prompt into the AI that forces it to follow these rules:

### 1. Wait Strategy Cleanup (Implicit/Explicit Waits)
Selenium relies heavily on `Thread.sleep()` and `WebDriverWait(driver, 10).until(ExpectedConditions.elementToBeClickable(...))`.

**The Engine's Action:**
The tool instructs the AI to **DESTROY** all explicit/implicit wait logic. Playwright automatically awaits actionability (visibility, stable paint, receiving events) before performing actions.
- **Legacy Java:**
  \`\`\`java
  WebDriverWait wait = new WebDriverWait(driver, 10);
  wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("submit"))).click();
  \`\`\`
- **Playwright Translation:**
  \`\`\`typescript
  await page.locator('#submit').click();
  \`\`\`

### 2. Chronological Control Flow (Windows & Tabs)
Handling new browser tabs is fundamentally different. Selenium switches state *after* the action. Playwright requires a Promise setup *before* the action.

**The Engine's Action:**
The tool forces the AI to restructure the AST chronologically using `Promise.all([waitForEvent])`.
- **Legacy Python:**
  \`\`\`python
  driver.find_element_by_id("new-tab-btn").click()
  handles = driver.window_handles
  driver.switch_to.window(handles[1])
  \`\`\`
- **Playwright Translation:**
  \`\`\`typescript
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.locator('#new-tab-btn').click()
  ]);
  await newPage.waitForLoadState();
  // Perform actions on newPage
  \`\`\`

### 3. IFrame State Verification (Stateless Locators)
Selenium uses a persistent state shift: `driver.switchTo().frame()`. Playwright uses stateless `frameLocators`.

**The Engine's Action:**
The AI translates global driver frame shifts into chained locators.
- **Legacy Java:**
  \`\`\`java
  driver.switchTo().frame("payment-frame");
  driver.findElement(By.id("cc-number")).sendKeys("4242");
  driver.switchTo().defaultContent();
  \`\`\`
- **Playwright Translation:**
  \`\`\`typescript
  await page.frameLocator('[name="payment-frame"]').locator('#cc-number').fill('4242');
  \`\`\`

### 4. DOM API Mapping & Singleton Stripping
The engine guarantees exact syntax mapping for the DOM API and strips out legacy `Driver.getInstance()` singletons in favor of Playwright's native `{ page }` fixture.

| Selenium Paradigm | Playwright Translation |
| :--- | :--- |
| `By.id("foo")` | `page.locator('#foo')` |
| `By.xpath("//div")` | `page.locator('xpath=//div')` |
| `element.sendKeys("val")` | `locator.fill('val')` |
| `element.getText()` | `locator.textContent()` |
| `Select dropdown = new Select(el); dropdown.selectByValue("x");` | `locator.selectOption('x')` |

---

## 🤖 Advanced Example: Procedural Deconstruction

Often, legacy frameworks contain spaghetti code where Page Objects and Test Assertions are mixed together in a single `@Test` file. 

The MCP Server is smart enough to rip these apart into the Playwright-BDD triad: **Feature -> Step Definition -> Page Object**.

### Input: Legacy Java (`LegacyCheckoutTest.java`)
\`\`\`java
@Test
public void testGuestCheckout() {
    WebDriver driver = DriverFactory.getDriver();
    driver.get("https://shop.com");
    driver.findElement(By.id("search")).sendKeys("laptop");
    driver.findElement(By.id("search-btn")).click();
    
    WebDriverWait wait = new WebDriverWait(driver, 10);
    wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".add-to-cart"))).click();
    
    Assert.assertTrue(driver.findElement(By.id("cart-badge")).getText().contains("1"));
}
\`\`\`

### AI's Output (Dictated by the MCP Migration Engine)

**1. `checkout.feature`**
\`\`\`gherkin
Feature: Checkout Flow
  Scenario: Guest adds item to cart
    Given I navigate to the shop
    When I search for "laptop" and add it to the cart
    Then the cart badge should display 1 item
\`\`\`

**2. `CheckoutPage.ts`**
\`\`\`typescript
import { Page, expect } from '@playwright/test';

export class CheckoutPage {
  constructor(public readonly page: Page) {}

  async navigate() {
    await this.page.goto('https://shop.com');
  }

  async searchAndAddToCart(term: string) {
    await this.page.locator('#search').fill(term);
    await this.page.locator('#search-btn').click();
    await this.page.locator('.add-to-cart').click();
  }

  async verifyCartBadge(expectedCount: string) {
    await expect(this.page.locator('#cart-badge')).toContainText(expectedCount);
  }
}
\`\`\`

*(The AI will also generate the intermediate BDD Step Definition file linking the Gherkin to the Page Object, reusing existing steps if the analyzer found them).*
