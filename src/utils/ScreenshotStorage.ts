import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * ScreenshotStorage.ts
 * Manages off-context screenshot storage to prevent base64 data from bloating MCP responses.
 */

export interface StoredScreenshot {
  filePath: string;
  relativePath: string;
  timestamp: number;
  size: number;
}

export class ScreenshotStorage {
  private static getStorageDirectory(projectRoot: string): string {
    const dir = path.join(projectRoot, '.TestForge', 'screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Stores a base64 screenshot securely and returns its metadata instead of the raw data.
   * @param projectRoot Working project directory
   * @param prefix Descriptive prefix for the filename (e.g., 'heal-attempt')
   * @param base64Data Raw base64 image data
   */
  public static storeBase64(projectRoot: string, prefix: string, base64Data: string): StoredScreenshot {
    const dir = this.getStorageDirectory(projectRoot);
    const hash = crypto.createHash('md5').update(base64Data).digest('hex').substring(0, 8);
    
    // Strip any Data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const fileName = `${prefix}-${hash}.png`;
    const fullPath = path.join(dir, fileName);
    
    fs.writeFileSync(fullPath, buffer);
    
    return {
      filePath: fullPath,
      relativePath: path.relative(projectRoot, fullPath).replace(/\\/g, '/'),
      timestamp: Date.now(),
      size: buffer.length
    };
  }
}
