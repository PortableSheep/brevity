import { readFileSync } from "node:fs";
import { join } from "node:path";

export class Viewer {
  private readonly sections = new Map<string, string>();

  constructor(private readonly baseDir: string) {}

  static e(value: unknown): string {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  section(name: string, fallback = ""): string {
    return this.sections.get(name) ?? fallback;
  }

  setSection(name: string, value: unknown): void {
    this.sections.set(name, String(value ?? ""));
  }

  render(viewFile: string, data: Record<string, unknown> = {}): string {
    const source = readFileSync(join(this.baseDir, viewFile), "utf8");
    const rawRendered = source.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, key: string) =>
      String(resolvePath(data, key) ?? ""),
    );
    return rawRendered.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) =>
      Viewer.e(resolvePath(data, key)),
    );
  }
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc === null || acc === undefined || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}
