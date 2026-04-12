import { McpErrors, McpError, McpErrorCode } from '../types/ErrorSystem.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * FileGuard.ts
 * Implements binary file detection via extension allowlist and 64KB magic-number sniff.
 */

// Extensions known to be binary or non-text
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.wasm', '.zip', '.gz', '.tar', '.7z', '.bz2', '.xz',
  '.db', '.sqlite', '.sqlite3', '.map', '.pdf', '.doc', '.docx', '.xls', '.xlsx'
]);

export class FileGuard {
  /**
   * Checks if a file is explicitly blocked by extension or appears binary based on content.
   */
  public static isBinary(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      return true;
    }

    if (!fs.existsSync(filePath)) {
      return false; // Can't be binary if it doesn't exist
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) return false;
      
      const buffer = Buffer.alloc(Math.min(stats.size, 65536)); // Up to 64KB chunk
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);

      return this.hasBinaryZero(buffer);
    } catch {
      return false; // Fail open for permission issues, etc.
    }
  }

  private static hasBinaryZero(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) { // NULL byte indicates binary usually
        return true;
      }
    }
    return false;
  }

  /**
   * Reads a text file safely, throwing an error if it appears to be binary.
   */
  public static readTextFileSafely(filePath: string): string {
    if (this.isBinary(filePath)) {
      throw McpErrors.binaryFileRejected(filePath, "Reading binary files as text is not allowed.");
    }
    return fs.readFileSync(filePath, 'utf-8');
  }
}
