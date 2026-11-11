# CU Bank Cypress system tests

Start the backend (`npm start` in `backend`) with a working MongoDB configuration
and the React frontend (`npm start` in `frontend`). The suite uses the real UI at
http://localhost:3000 and real API at http://localhost:4000/api/v1; responses are
not mocked. Run against a development/test database.

From this directory:

```powershell
npm test
# Interactive runner for a demo:
npm run test:open
```

Select E2E Testing and `spec.cy.js` in the interactive runner.
If launching from an environment that sets `ELECTRON_RUN_AS_NODE=1`, clear it in
the current PowerShell session before running Cypress:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm test
```

Each test is independent. Setup registers fresh randomly numbered accounts using
the API (initial balance 0); login and tested transactions use the UI. Accounts
remain in MongoDB after the run because the app has no account deletion endpoint.
Use a disposable test database for repeated runs. Do not run against production.

| Test | Inputs and expected result |
| --- | --- |
| S1 | Register account `123456789X`: reject nonnumeric account |
| S2 | Existing account, incorrect password `9999`: reject login |
| S3 | Login, deposit 0: reject; balance/history unchanged |
| S4 | Login, deposit 1000, withdraw 1001: reject withdrawal; balance 1000 |
| S5 | Login, deposit 1000, withdraw 200, transfer 100 to nine-digit account: reject; balance 800 |
| S6 | Login with balance 0, pay water bill 100: reject; balance/history unchanged |
| S7 | Login, deposit 1000, pay water bill 250: balance 750 and bill history |
| S8 | Login as sender, deposit 1000, transfer 300; check sender 700, then login as recipient and check 300; verify both histories |

Assertions cover visible error messages, login navigation, balances, history
entries (type, target, amount, resulting balance), and persisted API state.
Network intercepts observe real requests; there are no fixed sleep delays.
Cypress automatically saves screenshots for failed tests in headless runs.

Login and successful transactions use `support/account-reload.js`. After the
successful POST/PUT response, the helper waits for a replacement document and
React to render the returned name, balance, history count and ready controls.
It does not wait for an `accountAfterReload` alias or a window-event flag: GET
timing, duplicate requests and browser caching are not readiness requirements.
Navigation and history assertions query from the document each time instead of
retaining a DOM subject with `within()` across asynchronous updates.
The GET intercept removes conditional cache headers (`If-None-Match` and
`If-Modified-Since`) so the real API returns a fresh body instead of a bodyless
304 response. Login also waits for its POST response before checking the new
document. These changes do not mock account data or relax requirement assertions.
The returned account is used only to synchronize rendering; scenario assertions
still compare balances/history against independently specified expected values.

Run `npm run test:reload` for the focused regression suite. It exercises repeated
login, deposit, withdrawal, bill payment, transfer and account switching with
normal and deliberately delayed real GET responses. The normal `npm test`
continues to run all 47 requirement cases, including known expected failures.

## Requirement checks

The original eight flows remain, with additional independent cases labelled
S1-S8 for requirement classes. Expected messages are transcribed from PDF pages
1-4 into `cypress/fixtures/requirements.json`. The suite does not accept the
application's current response as its expected result, swallow assertion errors,
or mark known defects as passing/skipped.

Additional checks include registration/account/password lengths, duplicate
accounts, 30/31-character fullnames including the separating space, registration
success alert/redirect, missing login accounts, negative/decimal amounts,
self/missing/nonnumeric transfer recipients, insufficient funds, all three bill
targets, and missing bill selection. Each rejected transaction must preserve
balance and full persisted history; rejected transfers check both accounts.

The PDF states that withdrawals, transfers and bill payments must be **less than**
the current balance. Equal-balance cases therefore expect rejection. If the
requirement is clarified to allow equality, update that expectation explicitly.

Messages are compared exactly after normalizing whitespace from PDF line wraps.
The PDF's registration number/password errors omit a final period, unlike its
login errors; a wording/punctuation mismatch is a failed message contract.
Registration success expects the PDF's `success` alert.

HTML number inputs cannot retain alphabetic text: nonnumeric amount checks are
explicit API contract tests (not simulated UI typing). Decimal tests use normal
UI input/submission without disabling native validation. If the browser blocks
submission but the specified application error is absent, the message contract
fails; this is distinct from accepting/persisting a decimal transaction.
Bill selection has no specified error message, so its test checks native form
invalidity and unchanged state instead.

Run failures return a nonzero exit code and save screenshots under
`cypress/screenshots/spec.cy.js/`. A rejected operation with the correct expected
error **passes**; a missing/wrong error, unexpected acceptance, wrong balance or
wrong history **fails**. Passing these cases does not establish exhaustive EQ
coverage or guarantee absence of defects in all possible inputs.
