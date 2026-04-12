export type ErrorDnaCode = 'Infrastructure' | 'Logic' | 'Transient';

export interface ErrorDna {
  code: ErrorDnaCode;
  reason: string;
  causalChain: string;
  originalError: string;
}

export class ErrorClassifier {
  /**
   * Parses common Playwright/shell errors into DNA codes.
   */
  public static classify(errorText: string): ErrorDna {
    let code: ErrorDnaCode = 'Logic';
    const text = errorText.toLowerCase();

    // Transient signatures
    if (
      text.includes('timeout') ||
      text.includes('econnrefused') ||
      text.includes('econnreset') ||
      text.includes('net::err') ||
      text.includes('socket hang up') ||
      text.includes('browser has been closed') ||
      text.includes('exceeded')
    ) {
      code = 'Transient';
    }
    // Infrastructure signatures
    else if (
      text.includes('cannot find module') ||
      text.includes('syntaxerror') ||
      text.includes('error ts') ||
      text.includes('executable doesn\'t exist') ||
      text.includes('command not found') ||
      text.includes('playwright test needs to be invoked') ||
      text.includes('no tests found') ||
      text.includes('sigkill') ||
      text.includes('crashed') ||
      text.includes('out of memory')
    ) {
      code = 'Infrastructure';
    }

    // Attempt to extract a simple causal chain or root cause snippet
    const lines = errorText.split('\n');
    const rootCauseLine = lines.find(l => /(Error:|error:|^Error\b|Exception)/i.test(l)) || lines[0] || 'Unknown error';

    return {
      code,
      reason: ErrorClassifier.getReasonDescription(code),
      causalChain: rootCauseLine.trim(),
      originalError: errorText
    };
  }

  private static getReasonDescription(code: ErrorDnaCode): string {
    switch (code) {
      case 'Infrastructure': return 'Environment or compilation issue';
      case 'Logic': return 'Test assumption failed (locator or assertion)';
      case 'Transient': return 'Timing, network, or browser stability issue';
      default: return 'Unknown issue';
    }
  }
}
