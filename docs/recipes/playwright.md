# Playwright E2E

Check that your form works in a real browser, with and without JavaScript.
This recipe uses Playwright 1.56.0 and Chromium.

## Start the fixture and wait for readiness

<<< @/samples/playwright.config.ts

This bounded fixture uses port 3107 and refuses to reuse an unrelated server.
The HTTP unit tests use ephemeral ports; Playwright's fixture has a configured
origin so the browser can navigate predictably.

## Exercise both experiences

<<< @/samples/e2e/notebook.spec.ts

Label/role locators exercise the accessible control markup. The no-JS test checks
the actual 422 response and retained value, not just the presence of a button.

```sh
npm run build:packages
npm run docs:check
npx playwright install chromium
npm run docs:e2e
```

On Linux CI, install browser system libraries with
`npx playwright install --with-deps chromium`; `.github/workflows/docs.yml`
does this before running the same tests.

Test hosted sign-in separately with a configured provider.
