export enum ErrorCode {
  E001_NO_SESSION        = 'E001_NO_SESSION',
  E002_BROWSER_CRASHED   = 'E002_BROWSER_CRASHED',
  E003_URL_UNREACHABLE   = 'E003_URL_UNREACHABLE',
  E004_PLAYWRIGHT_MISSING= 'E004_PLAYWRIGHT_MISSING',
  E005_CONFIG_CORRUPT    = 'E005_CONFIG_CORRUPT',
  E006_TS_COMPILE_FAIL   = 'E006_TS_COMPILE_FAIL',
  E007_AMBIGUITY         = 'E007_AMBIGUITY',
  E008_PRECONDITION_FAIL = 'E008_PRECONDITION_FAIL',
}

export class TestForgeError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly remediation: string[]
  ) {
    super(message);
    this.name = 'TestForgeError';
  }
}
