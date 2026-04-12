import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Log Event Types ──────────────────────────────────────────────────────────

export type LogEventType =
  | 'tool_start'
  | 'tool_end'
  | 'tool_error'
  | 'warning';

export interface BaseLogEvent {
  type: LogEventType;
  traceId: string;
  timestamp: string;   // ISO 8601
}

export interface ToolStartEvent extends BaseLogEvent {
  type: 'tool_start';
  tool: string;
  inputSummary: Record<string, any>;
}

export interface ToolEndEvent extends BaseLogEvent {
  type: 'tool_end';
  tool: string;
  success: boolean;
  durationMs: number;
  outputSummary: Record<string, any>;
}

export interface ToolErrorEvent extends BaseLogEvent {
  type: 'tool_error';
  tool: string;
  errorMessage: string;
  stack?: string;
  durationMs: number;
}

export interface WarningEvent extends BaseLogEvent {
  type: 'warning';
  message: string;
  context?: Record<string, any>;
}

export type LogEvent = ToolStartEvent | ToolEndEvent | ToolErrorEvent | WarningEvent;

// ─── ObservabilityService ─────────────────────────────────────────────────────

export class ObservabilityService {
  private static instance: ObservabilityService;
  private logStreams = new Map<string, fs.WriteStream>();
  private isEnabled: boolean = true;

  private constructor() {}

  public static getInstance(): ObservabilityService {
    if (!ObservabilityService.instance) {
      ObservabilityService.instance = new ObservabilityService();
    }
    return ObservabilityService.instance;
  }

  public toolStart(toolName: string, inputArgs: Record<string, any>): string {
    const traceId = crypto.randomBytes(6).toString('hex');
    const projectRoot = inputArgs?.projectRoot as string | undefined;
    
    this.emit(projectRoot, {
      type: 'tool_start',
      traceId,
      timestamp: new Date().toISOString(),
      tool: toolName,
      inputSummary: this.sanitize(inputArgs),
    });

    return traceId;
  }

  public toolEnd(
    traceId: string,
    toolName: string,
    success: boolean,
    outputSummary: Record<string, any>,
    startTimeMs: number,
    projectRoot?: string
  ): void {
    this.emit(projectRoot, {
      type: 'tool_end',
      traceId,
      timestamp: new Date().toISOString(),
      tool: toolName,
      success,
      durationMs: Date.now() - startTimeMs,
      outputSummary: this.sanitize(outputSummary),
    });
  }

  public toolError(
    traceId: string,
    toolName: string,
    error: Error | unknown,
    startTimeMs: number,
    projectRoot?: string
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));

    this.emit(projectRoot, {
      type: 'tool_error',
      traceId,
      timestamp: new Date().toISOString(),
      tool: toolName,
      durationMs: Date.now() - startTimeMs,
      errorMessage: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines only
    });
  }

  public warning(projectRoot: string | undefined, message: string, context?: Record<string, any>): void {
    const traceId = crypto.randomBytes(6).toString('hex');
    this.emit(projectRoot, {
      type: 'warning',
      traceId,
      timestamp: new Date().toISOString(),
      message,
      context: this.sanitize(context || {})
    });
  }

  private emit(projectRoot: string | undefined, event: Record<string, any>): void {
    if (!this.isEnabled || !projectRoot) return;

    try {
      const stream = this.getStream(projectRoot);
      if (stream) {
        stream.write(JSON.stringify(event) + '\n');
      }
    } catch {
      // Never throw from observability code
    }
  }

  private getStream(projectRoot: string): fs.WriteStream | null {
    if (this.logStreams.has(projectRoot)) {
      return this.logStreams.get(projectRoot)!;
    }

    try {
      const logDir = path.join(projectRoot, 'mcp-logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFilePath = path.join(logDir, `session-${timestamp}.jsonl`);
      const stream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf-8' });
      
      stream.on('error', () => {
        this.logStreams.delete(projectRoot);
      });

      this.logStreams.set(projectRoot, stream);
      return stream;
    } catch {
      return null;
    }
  }

  private sanitize(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('env')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
      } else if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + `...[truncated, ${value.length} total]`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
