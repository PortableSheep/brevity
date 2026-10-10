import { fields, labels, limits, type Errors, type Values, type Ticket, type Inbox } from "./domain.js";

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function layout(body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Support inbox</title>
<link rel="stylesheet" href="/assets/app.css"><script defer src="/assets/app.js"></script></head>
<body><header><a href="/requests/new">Ask for help</a><a href="/inbox">Demo inbox</a></header>
<main><p class="notice">Local demonstration: inbox administration has no authentication. Use fictional information.</p>${body}</main></body></html>`;
}
const id = (key: string) => `form-${key}`;
const inlineErrors = (key: string, errors: Errors) => {
  const messages = errors[key as keyof Errors] ?? [];
  return messages.length ? `<ul id="${id(key)}-errors">${messages.map(message => `<li>${escape(message)}</li>`).join("")}</ul>` : "";
};
const summary = (errors: Errors) => {
  const items = Object.entries(errors).flatMap(([key, messages]) => messages.map(message =>
    `<li><a href="#${id(key)}">${escape(key === "status" ? "Status" : labels[key as keyof typeof labels])}: ${escape(message)}</a></li>`));
  return items.length ? `<div role="alert" tabindex="-1" aria-labelledby="error-heading"><h2 id="error-heading">Please correct the following errors</h2><ul>${items.join("")}</ul></div>` : "";
};
export function createView(token: string, values?: Values, errors: Errors = {}) {
  return `<h1>How can we help?</h1><p>Send a support request. Every field is required.</p>${summary(errors)}
<form method="post" action="/requests"><input type="hidden" name="_token" value="${escape(token)}">
${fields.map(key => {
    const invalid = !!errors[key]?.length;
    const describedBy = [key === "details" ? "details-count" : "", invalid ? `${id(key)}-errors` : ""].filter(Boolean).join(" ");
    const attributes = `id="${id(key)}" name="${key}" maxlength="${limits[key]}" required aria-invalid="${invalid}" aria-describedby="${describedBy}"`;
    return `<div class="field"><label for="${id(key)}">${labels[key]}</label>
${key === "details"
      ? `<textarea ${attributes}>${escape(values?.[key] ?? "")}</textarea><p id="details-count" aria-live="polite">Maximum 2000 characters.</p>`
      : `<input ${attributes} type="${key === "email" ? "email" : "text"}" value="${escape(values?.[key] ?? "")}">`}
${inlineErrors(key, errors)}</div>`;
  }).join("")}<button>Send request</button></form>`;
}
export function detailView(ticket: Ticket, token: string, errors: Errors = {}) {
  return `<h1>${escape(ticket.subject)}</h1><p>From ${escape(ticket.name)} (${escape(ticket.email)})</p>
<p class="details">${escape(ticket.details)}</p><p>Created <time>${escape(ticket.createdAt)}</time></p>
<p>Status: <strong>${ticket.status}</strong></p>${summary(errors)}
<form method="post" action="/requests/${ticket.id}/status"><input type="hidden" name="_token" value="${escape(token)}">
<label for="${id("status")}">Status</label><select id="${id("status")}" name="status" aria-invalid="${!!errors.status?.length}" aria-describedby="${errors.status?.length ? `${id("status")}-errors` : ""}">
${["open", "closed"].map(status => `<option value="${status}"${status === ticket.status ? " selected" : ""}>${status}</option>`).join("")}
</select>${inlineErrors("status", errors)}<button>Update status</button></form><p><a href="/inbox">Back to inbox</a></p>`;
}
export function inboxView(inbox: Inbox) {
  const href = (page: number) => escape(`/inbox?${new URLSearchParams({ q: inbox.q, status: inbox.status, page: String(page) })}`);
  return `<h1>Support inbox</h1><form method="get" action="/inbox" class="filters">
<label for="search">Search</label><input id="search" name="q" value="${escape(inbox.q)}" maxlength="120">
<label for="filter">Status</label><select id="filter" name="status"><option value="">All</option>
${["open", "closed"].map(status => `<option value="${status}"${status === inbox.status ? " selected" : ""}>${status}</option>`).join("")}
</select><button>Filter</button></form><p>${inbox.total} requests. Page ${inbox.page} of ${inbox.pages}.</p>
<ul class="tickets">${inbox.tickets.map(ticket => `<li><a href="/requests/${ticket.id}">${escape(ticket.subject)}</a><span>${escape(ticket.name)} &middot; ${ticket.status}</span></li>`).join("")}</ul>
${!inbox.total ? "<p>No requests match.</p>" : ""}<nav aria-label="Pagination">
${inbox.page > 1 ? `<a rel="prev" href="${href(inbox.page - 1)}">Previous</a>` : ""}
${inbox.page < inbox.pages ? `<a rel="next" href="${href(inbox.page + 1)}">Next</a>` : ""}</nav>`;
}
export const errorView = (status: number, message: string) => `<h1>${status}</h1><p>${escape(message)}</p>`;
