export interface LoginMacro {
  loginUrl: string;
  userSelector: string;
  usernameValue: string;
  passSelector: string;
  passwordValue: string;
  submitSelector: string;
}

export interface IDomInspector {
  /**
   * Navigates to a target URL headlessly and returns a highly simplified
   * Accessibility Tree (AOM) or cleaned DOM representation.
   * This provides the LLM with exact, real locators (roles, names, aria properties).
   */
  inspect(url: string, waitForSelector?: string, storageState?: string, includeIframes?: boolean, loginMacro?: LoginMacro): Promise<string>;
}
