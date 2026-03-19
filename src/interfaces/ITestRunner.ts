export interface TestRunnerResult {
  passed: boolean;
  output: string;
}

export interface ITestRunner {
  /**
   * Executes the Playwright-BDD test suite and returns the console output
   * to verify if the generated tests compile and pass.
   */
  runTests(projectRoot: string, specificTestArgs?: string): Promise<TestRunnerResult>;
}
