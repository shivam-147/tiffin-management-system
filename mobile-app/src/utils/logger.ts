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

// In Expo & React Native:
// __DEV__ is globally injected as `true` in development and `false` in production release builds.
const isDev =
  typeof __DEV__ !== "undefined"
    ? Boolean(__DEV__)
    : (process.env.NODE_ENV || "development").toLowerCase() !== "production";

class MobileLogger {
  private enabled: boolean;

  constructor() {
    this.enabled = isDev;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public isDevelopment(): boolean {
    return this.enabled;
  }

  private getTimestamp(): string {
    const d = new Date();
    return d.toTimeString().split(" ")[0] || d.toISOString();
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
    if (!this.enabled) return;
    console.info(this.formatPrefix("info"), ...args);
  }

  public warn(...args: unknown[]): void {
    if (!this.enabled) return;
    console.warn(this.formatPrefix("warn"), ...args);
  }

  public error(...args: unknown[]): void {
    if (!this.enabled) return;
    console.error(this.formatPrefix("error"), ...args);
  }

  public log(...args: unknown[]): void {
    if (!this.enabled) return;
    console.log(this.formatPrefix("log"), ...args);
  }

  public debug(...args: unknown[]): void {
    if (!this.enabled) return;
    console.debug(this.formatPrefix("debug"), ...args);
  }
}

export const logger = new MobileLogger();
export default logger;
