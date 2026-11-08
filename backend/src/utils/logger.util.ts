type LogLevel = "info" | "warn" | "error" | "log" | "debug";

const ANSI_COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[90m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

class BackendLogger {
  private isDev: boolean;

  constructor() {
    this.isDev = (process.env.NODE_ENV || "development").toLowerCase() !== "production";
  }

  public setDev(isDev: boolean): void {
    this.isDev = isDev;
  }

  public isDevelopment(): boolean {
    return this.isDev;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace("T", " ").replace("Z", "");
  }

  private formatPrefix(level: LogLevel): string {
    const time = `${ANSI_COLORS.dim}[${this.getTimestamp()}]${ANSI_COLORS.reset}`;
    switch (level) {
      case "info":
        return `${time} ${ANSI_COLORS.bold}${ANSI_COLORS.green}[INFO]${ANSI_COLORS.reset}`;
      case "warn":
        return `${time} ${ANSI_COLORS.bold}${ANSI_COLORS.yellow}[WARN]${ANSI_COLORS.reset}`;
      case "error":
        return `${time} ${ANSI_COLORS.bold}${ANSI_COLORS.red}[ERROR]${ANSI_COLORS.reset}`;
      case "debug":
        return `${time} ${ANSI_COLORS.bold}${ANSI_COLORS.magenta}[DEBUG]${ANSI_COLORS.reset}`;
      case "log":
      default:
        return `${time} ${ANSI_COLORS.bold}${ANSI_COLORS.cyan}[LOG]${ANSI_COLORS.reset}`;
    }
  }

  public info(...args: unknown[]): void {
    if (!this.isDev) return;
    console.info(this.formatPrefix("info"), ...args);
  }

  public warn(...args: unknown[]): void {
    if (!this.isDev) return;
    console.warn(this.formatPrefix("warn"), ...args);
  }

  public error(...args: unknown[]): void {
    if (!this.isDev) return;
    console.error(this.formatPrefix("error"), ...args);
  }

  public log(...args: unknown[]): void {
    if (!this.isDev) return;
    console.log(this.formatPrefix("log"), ...args);
  }

  public debug(...args: unknown[]): void {
    if (!this.isDev) return;
    console.debug(this.formatPrefix("debug"), ...args);
  }
}

export const logger = new BackendLogger();
export default logger;
