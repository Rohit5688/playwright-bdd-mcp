import { chromium } from 'playwright';
export class DomInspectorService {
    async inspect(url, waitForSelector, storageState, includeIframes, loginMacro) {
        let browser = null;
        try {
            browser = await chromium.launch({ headless: true });
            const contextArgs = {};
            if (storageState) {
                contextArgs.storageState = storageState;
            }
            const context = await browser.newContext(contextArgs);
            const page = await context.newPage();
            // Dynamic Macro Login sequence
            if (loginMacro) {
                await page.goto(loginMacro.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.fill(loginMacro.userSelector, loginMacro.usernameValue);
                await page.fill(loginMacro.passSelector, loginMacro.passwordValue);
                await page.click(loginMacro.submitSelector);
                await page.waitForLoadState('networkidle').catch(() => { });
            }
            // Navigate to ultimate destination
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => { });
            if (waitForSelector) {
                await page.waitForSelector(waitForSelector, { timeout: 5000 }).catch(() => { });
            }
            // --- 18A FIX: Null-safe AOM snapshot with semantic DOM fallback ---
            // page.accessibility.snapshot() can return null on pages where the AOM tree
            // is unavailable (CSP-blocked, purely iframe-based, or accessibility-disabled pages).
            let mainSnapshot = null;
            try {
                mainSnapshot = await page.accessibility?.snapshot?.() ?? null;
            }
            catch {
                mainSnapshot = null;
            }
            // Fallback: extract a compact semantic structure by querying interactive elements directly
            if (!mainSnapshot) {
                mainSnapshot = await page.evaluate(() => {
                    const sel = 'a, button, input, select, textarea, [role], h1, h2, h3, label';
                    return {
                        fallback: true,
                        elements: Array.from(document.querySelectorAll(sel))
                            .slice(0, 100)
                            .map(el => ({
                            tag: el.tagName.toLowerCase(),
                            role: el.getAttribute('role') ?? undefined,
                            name: (el.getAttribute('aria-label') ?? el.getAttribute('name') ?? el.textContent?.trim().slice(0, 60)) || undefined,
                            id: el.id || undefined,
                            testId: el.getAttribute('data-testid') || undefined,
                        }))
                    };
                });
            }
            const result = { mainFrame: mainSnapshot };
            // Optional recursive pass for inner frames (like Stripe fields or generic embedded sites)
            if (includeIframes) {
                result.iframes = [];
                for (const frame of page.frames()) {
                    if (frame === page.mainFrame() || frame.isDetached())
                        continue;
                    try {
                        const fSnap = await frame.accessibility?.snapshot?.() ?? null;
                        if (fSnap)
                            result.iframes.push({ url: frame.url(), snapshot: fSnap });
                    }
                    catch (e) {
                        result.iframes.push({ url: frame.url(), snapshot: 'Cross-origin or isolated frame restricted.' });
                    }
                }
            }
            return JSON.stringify(result, null, 2);
        }
        catch (error) {
            // --- 18A FIX: Friendly, actionable error messages ---
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('ECONNREFUSED') || msg.includes('ERR_CONNECTION_REFUSED')) {
                return `[ERROR] Could not reach "${url}". Is the server running and accessible from this machine?`;
            }
            if (msg.includes('ERR_CERT') || msg.includes('SSL') || msg.includes('certificate')) {
                return `[ERROR] The page at "${url}" uses an untrusted SSL certificate. Add "ignoreHTTPSErrors: true" to your Playwright config.`;
            }
            if (msg.toLowerCase().includes('timeout')) {
                return `[ERROR] Page at "${url}" took too long to load. Try passing a "waitForSelector" to wait for a specific element, or verify the URL is publicly accessible.`;
            }
            return `[ERROR] Failed to inspect DOM at ${url}:\n${msg}`;
        }
        finally {
            if (browser)
                await browser.close().catch(() => { });
        }
    }
}
//# sourceMappingURL=DomInspectorService.js.map