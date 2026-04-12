import type { Page } from 'playwright';
export interface SessionOptions {
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    storageState?: string;
    userAgent?: string;
}
export declare class PlaywrightSessionService {
    private browser;
    private context;
    private page;
    /**
     * Starts a persistent browser session.
     */
    startSession(options?: SessionOptions): Promise<string>;
    /**
     * Ends the current browser session.
     */
    endSession(): Promise<string>;
    /**
     * Navigates the persistent session to a URL.
     */
    navigate(url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle', timeoutMs?: number): Promise<string>;
    /**
     * Proactively verifies a selector without running a full test.
     * Checks if it resolves to exactly one element and if it is visible/enabled.
     */
    verifySelector(selector: string): Promise<string>;
    getPage(): Page | null;
}
//# sourceMappingURL=PlaywrightSessionService.d.ts.map