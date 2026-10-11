import { createFormState, html, type FormState, type HtmlFragment } from "@brevity/web";

export function notePage(data: {
  notes: readonly { id: number; text: string }[];
  form: FormState;
  enhancement?: HtmlFragment;
}) {
  const field = data.form.field("text", { describedBy: "text-hint" });
  return html`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>Notebook</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head><body><main><h1>Notebook</h1>
      ${data.form.errorSummary()}
      <form method="post" action="/notes">
        <label for="${field.id}">Note</label>
        <p id="text-hint">Write between 1 and 200 characters.</p>
        <textarea id="${field.id}" name="${field.name}"
          aria-invalid="${field.invalid}" aria-describedby="${field.describedBy}"
          maxlength="200">${field.value}</textarea>
        ${data.form.fieldErrors("text")}
        <button type="submit">Save note</button>
      </form>
      <ul>${data.notes.map(note => html`<li>${note.text}</li>`)}</ul>
      ${data.enhancement}
    </main></body></html>`;
}

export const emptyForm = () => createFormState({ labels: { text: "Note" } });
