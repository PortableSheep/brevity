import { html, type HtmlFragment } from "./html.js";

export type FormOptions = {
  values?: Readonly<Record<string, string | undefined>>;
  errors?: Readonly<Record<string, readonly string[]>>;
  labels?: Readonly<Record<string, string>>;
  idPrefix?: string;
};

export type FormField = {
  id: string;
  name: string;
  value: string;
  invalid: boolean;
  describedBy: string;
};

export type FormState = {
  value: (name: string) => string;
  field: (name: string, options?: { describedBy?: string }) => FormField;
  fieldErrors: (name: string) => HtmlFragment;
  errorSummary: () => HtmlFragment;
};

export function createFormState(options: FormOptions = {}): FormState {
  const prefix = options.idPrefix ?? "form";
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(prefix)) {
    throw new TypeError(
      "Form idPrefix must start with a letter and contain only letters, numbers, _ or -",
    );
  }
  const values = new Map(Object.entries(options.values ?? {}));
  const errors = new Map(
    Object.entries(options.errors ?? {}).map(([name, messages]) => [name, [...messages]]),
  );
  const labels = new Map(Object.entries(options.labels ?? {}));
  const id = (name: string) => `${prefix}-${Buffer.from(name, "utf16le").toString("hex")}`;
  const messages = (name: string) => errors.get(name) ?? [];
  const value = (name: string) => values.get(name) ?? "";

  return {
    value,
    field(name, fieldOptions = {}) {
      const invalid = messages(name).length > 0;
      return {
        id: id(name),
        name,
        value: value(name),
        invalid,
        describedBy: [fieldOptions.describedBy, invalid ? `${id(name)}-errors` : ""]
          .filter(Boolean)
          .join(" "),
      };
    },
    fieldErrors(name) {
      const list = messages(name);
      return list.length
        ? html`<ul id="${id(name)}-errors">
            ${list.map((message) => html`<li>${message}</li>`)}
          </ul>`
        : html``;
    },
    errorSummary() {
      const items = [...errors].flatMap(([name, list]) =>
        list.map(
          (message) =>
            html`<li><a href="#${id(name)}">${labels.get(name) ?? name}: ${message}</a></li>`,
        ),
      );
      return items.length
        ? html`<div role="alert" tabindex="-1" aria-labelledby="${prefix}-error-heading">
            <h2 id="${prefix}-error-heading">Please correct the following errors</h2>
            <ul>
              ${items}
            </ul>
          </div>`
        : html``;
    },
  };
}
