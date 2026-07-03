import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@brevity/core";
import type { Container, Response } from "@brevity/core";

export type DebugConfig = {
  enabled: boolean;
  verbose?: boolean;
};

type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
};

export type DebugPluginOptions = Partial<DebugConfig> & {
  key?: string;
};

export class DebugService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 100;
  private readonly template = readFileSync(
    fileURLToPath(new URL("../src/templates/debug-error.html", import.meta.url)),
    "utf8",
  );

  constructor(private config: DebugConfig = { enabled: false }) {}

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.config.enabled) return;

    const entry: LogEntry = { level, message, timestamp: new Date(), data };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const suffix = data ? ` ${JSON.stringify(data, null, 2)}` : "";
    console.log(`${prefix} ${message}${suffix}`);
  }

  info(message: string, data?: unknown): void { this.log("info", message, data); }
  warn(message: string, data?: unknown): void { this.log("warn", message, data); }
  error(message: string, data?: unknown): void { this.log("error", message, data); }
  debug(message: string, data?: unknown): void { if (this.config.verbose) this.log("debug", message, data); }

  getLogs(): LogEntry[] { return [...this.logs]; }
  clear(): void { this.logs = []; }

  renderErrorPage(error: Error, requestInfo?: Record<string, unknown>): string {
    const logs = this.getLogs().map(renderLogEntry).join("");
    const stackSection = error.stack
      ? `<pre class="stack">${escapeHtml(error.stack)}</pre>`
      : "";
    const requestSection = requestInfo
      ? `<details><summary>Request Info</summary><pre>${escapeHtml(JSON.stringify(requestInfo, null, 2))}</pre></details>`
      : "";

    return this.template
      .replace("{{message}}", escapeHtml(error.message))
      .replace("{{stackSection}}", stackSection)
      .replace("{{requestSection}}", requestSection)
      .replace("{{logCount}}", String(logs.length))
      .replace("{{{logsSection}}}", logs || '<p class="empty">No logs yet.</p>');
  }

  renderErrorResponse(res: Response, error: Error, requestInfo?: Record<string, unknown>): void {
    res.status(500).header("content-type", "text/html; charset=utf-8").send(this.renderErrorPage(error, requestInfo));
  }
}

export class DebugPlugin extends Plugin {
  readonly name = "debug";
  readonly description = "Registers the development debug service";

  constructor(private readonly options: DebugPluginOptions = {}) {
    super();
  }

  register(container: Container): void {
    const key = this.options.key ?? "debug";
    const { key: _key, ...config } = this.options;
    container.singleton(
      key,
      () =>
        new DebugService({
          enabled: config.enabled ?? process.env.NODE_ENV !== "production",
          verbose: config.verbose ?? false,
        }),
    );
  }
}

function renderLogEntry(log: LogEntry): string {
  return `
    <div class="log-entry log-${log.level}">
      <div>
        <span class="log-level level-${log.level}">${log.level.toUpperCase()}</span>
        <span class="log-msg">${escapeHtml(log.message)}</span>
      </div>
      <div class="log-time">${log.timestamp.toISOString()}</div>
      ${
        log.data
          ? `<div class="log-data"><pre>${escapeHtml(JSON.stringify(log.data, null, 2))}</pre></div>`
          : ""
      }
    </div>
  `;
}

function escapeHtml(text: string): string {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
