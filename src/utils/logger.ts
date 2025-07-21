export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static colorize(level: string, message: string): string {
    const colors = {
      INFO: '\x1b[36m',  // Cyan
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      SUCCESS: '\x1b[32m', // Green
      RESET: '\x1b[0m'   // Reset
    };

    const color = colors[level as keyof typeof colors] || colors.RESET;
    return `${color}[${level}]${colors.RESET}`;
  }

  static info(message: string, meta?: any): void {
    const timestamp = this.formatTimestamp();
    const coloredLevel = this.colorize('INFO', 'INFO');
    console.log(`${timestamp} ${coloredLevel} ${message}`, meta || '');
  }

  static warn(message: string, meta?: any): void {
    const timestamp = this.formatTimestamp();
    const coloredLevel = this.colorize('WARN', 'WARN');
    console.warn(`${timestamp} ${coloredLevel} ${message}`, meta || '');
  }

  static error(message: string, error?: any): void {
    const timestamp = this.formatTimestamp();
    const coloredLevel = this.colorize('ERROR', 'ERROR');
    console.error(`${timestamp} ${coloredLevel} ${message}`, error || '');
  }

  static success(message: string, meta?: any): void {
    const timestamp = this.formatTimestamp();
    const coloredLevel = this.colorize('SUCCESS', 'SUCCESS');
    console.log(`${timestamp} ${coloredLevel} ${message}`, meta || '');
  }
}

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
};
