import { Viewer } from "@portablesheep/brevity";
import { type DebugService } from "@portablesheep/brevity-plugin-debug";

type DebugLog = ReturnType<DebugService["getLogs"]>[number];

export function renderDebugLogEntries(logs: DebugLog[]): string {
  return logs
    .map(
      (log) => `
        <div class="log-entry log-${log.level}">
          <div>
            <span class="log-level level-${log.level}">${log.level.toUpperCase()}</span>
            <span class="log-msg">${Viewer.e(log.message)}</span>
          </div>
          <div class="log-time">${log.timestamp.toISOString()}</div>
          ${
            log.data
              ? `<div class="log-data"><pre>${Viewer.e(JSON.stringify(log.data, null, 2))}</pre></div>`
              : ""
          }
        </div>
      `,
    )
    .join("");
}
