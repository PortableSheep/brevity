import { createFormState, html, type HtmlFragment } from "@portablesheep/brevity-web";
import {
  fields,
  labels,
  limits,
  type Errors,
  type Values,
  type Ticket,
  type Inbox,
} from "./domain.js";

export function layout(body: HtmlFragment) {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Support inbox</title>
        <link rel="stylesheet" href="/assets/app.css" />
        <script defer src="/assets/app.js"></script>
      </head>
      <body>
        <header><a href="/requests/new">Ask for help</a><a href="/inbox">Demo inbox</a></header>
        <main>
          <p class="notice">
            Local demonstration: inbox administration has no authentication. Use fictional
            information.
          </p>
          ${body}
        </main>
      </body>
    </html>`;
}
export function createView(token: string, values?: Values, errors?: Errors) {
  const form = createFormState({ values, errors, labels });
  return html`<h1>How can we help?</h1>
    <p>Send a support request. Every field is required.</p>
    ${form.errorSummary()}
    <form method="post" action="/requests">
      <input type="hidden" name="_token" value="${token}" /> ${fields.map((key) => {
        const field = form.field(key, {
          describedBy: key === "details" ? "details-count" : undefined,
        });
        return html`<div class="field">
          <label for="${field.id}">${labels[key]}</label> ${
            key === "details"
              ? html`<textarea
                    id="${field.id}"
                    name="${key}"
                    maxlength="${limits[key]}"
                    required
                    aria-invalid="${field.invalid}"
                    aria-describedby="${field.describedBy}"
                  >
${field.value}</textarea>
                  <p id="details-count" aria-live="polite">Maximum 2000 characters.</p>`
              : html`<input
                  id="${field.id}"
                  name="${key}"
                  type="${key === "email" ? "email" : "text"}"
                  value="${field.value}"
                  maxlength="${limits[key]}"
                  required
                  aria-invalid="${field.invalid}"
                  aria-describedby="${field.describedBy}"
                />`
          }
          ${form.fieldErrors(key)}
        </div>`;
      })}<button>Send request</button>
    </form>`;
}
export function detailView(ticket: Ticket, token: string, errors?: Errors) {
  const form = createFormState({
    errors,
    labels: { status: "Status" },
    values: { status: ticket.status },
  });
  const field = form.field("status");
  return html`<h1>${ticket.subject}</h1>
    <p>From ${ticket.name} (${ticket.email})</p>
    <p class="details">${ticket.details}</p>
    <p>Created <time>${ticket.createdAt}</time></p>
    <p>Status: <strong>${ticket.status}</strong></p>
    ${form.errorSummary()}
    <form method="post" action="/requests/${ticket.id}/status">
      <input type="hidden" name="_token" value="${token}" /> <label for="${field.id}">Status</label
      ><select
        id="${field.id}"
        name="status"
        aria-invalid="${field.invalid}"
        aria-describedby="${field.describedBy}"
      >
        ${["open", "closed"].map((status) => html`<option value="${status}" ${status === ticket.status ? html` selected` : html``}>${status}</option>`)}</select
      >${form.fieldErrors("status")}<button>Update status</button>
    </form>
    <p><a href="/inbox">Back to inbox</a></p>`;
}
export function inboxView(inbox: Inbox) {
  const href = (page: number) =>
    `/inbox?${new URLSearchParams({ q: inbox.q, status: inbox.status, page: String(page) })}`;
  return html`<h1>Support inbox</h1>
    <form method="get" action="/inbox" class="filters">
      <label for="search">Search</label
      ><input id="search" name="q" value="${inbox.q}" maxlength="120" />
      <label for="filter">Status</label
      ><select id="filter" name="status">
        <option value="">All</option>
        ${["open", "closed"].map((status) => html`<option value="${status}" ${status === inbox.status ? html` selected` : html``}>${status}</option>`)}</select
      ><button>Filter</button>
    </form>
    <p>${inbox.total} requests. Page ${inbox.page} of ${inbox.pages}.</p>
    <ul class="tickets">
      ${inbox.tickets.map((ticket) => html`<li><a href="/requests/${ticket.id}">${ticket.subject}</a><span>${ticket.name} &middot; ${ticket.status}</span></li>`)}
    </ul>
    ${!inbox.total ? html`<p>No requests match.</p>` : html``}
    <nav aria-label="Pagination">
      ${inbox.page > 1 ? html`<a rel="prev" href="${href(inbox.page - 1)}">Previous</a>` : html``}
      ${inbox.page < inbox.pages ? html`<a rel="next" href="${href(inbox.page + 1)}">Next</a>` : html``}
    </nav>`;
}
