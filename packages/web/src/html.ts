import type { Response } from "@brevity/core";

export class HtmlFragment {
  #markup: string;

  constructor(markup: string) {
    this.#markup = markup;
  }

  toString(): string {
    return this.#markup;
  }
}

export type HtmlValue =
  string | number | bigint | boolean | null | undefined | HtmlFragment | readonly HtmlValue[];

export type Template<Data> = (data: Data) => HtmlFragment;

export type Layout<Data> = (body: HtmlFragment, data: Data) => HtmlFragment;

export type PageOptions<Data> = { layout?: Layout<Data>; status?: number };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function interpolate(value: HtmlValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof HtmlFragment) return value.toString();
  if (Array.isArray(value)) return value.map(interpolate).join("");
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return escapeHtml(String(value));
  }
  throw new TypeError("HTML interpolation requires text, a fragment, or an array of these");
}

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): HtmlFragment {
  return new HtmlFragment(
    strings.reduce(
      (result, text, index) =>
        result + text + (index < values.length ? interpolate(values[index]) : ""),
      "",
    ),
  );
}

/** Trust only application-owned or independently sanitized markup, never request input. */
export function trustedHtml(markup: string): HtmlFragment {
  return new HtmlFragment(markup);
}

export function serializeJson(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) throw new TypeError("JSON data must have a serializable top-level value");
  return json.replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/* prettier-ignore */
export function jsonScript(id: string, data: unknown): HtmlFragment {
  return html`<script type="application/json" id="${id}">${trustedHtml(serializeJson(data))}</script>`;
}

export function renderPage<Data>(
  res: Response,
  template: Template<Data>,
  data: Data,
  options: PageOptions<Data> = {},
): void {
  const body = template(data);
  if (!(body instanceof HtmlFragment))
    throw new TypeError("Page templates must return an HTML fragment");
  const page = options.layout ? options.layout(body, data) : body;
  if (!(page instanceof HtmlFragment))
    throw new TypeError("Page layouts must return an HTML fragment");
  res.header("content-type", "text/html; charset=utf-8");
  res.header("x-content-type-options", "nosniff");
  res.send(page.toString(), options.status ?? 200);
}
