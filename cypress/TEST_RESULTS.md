# Requirement-based test run

Command: `npm test` from `cypress` (real frontend, backend and MongoDB).
Runner: Cypress 15.21.1, Electron headless.
Result: **47 tests: 31 passed, 16 failed, 0 skipped**. Exit code: **1**.
Duration: 12 minutes 54 seconds (verification after reload synchronization fix). Failure screenshots: **16** in
`cypress/screenshots/spec.cy.js/` relative to this directory.

Expected behavior/messages come from `document/CU_Bank_instruction-683935-17926530828015.pdf`,
pages 1-4, with message expectations in `cypress/fixtures/requirements.json`.

| Failed cases | Count | Observed difference |
| --- | ---: | --- |
| Registration numeric/length messages | 6 | Application adds a final period absent from the registration table in the PDF; rejection itself works |
| Registration fullname message | 1 | Application says `The combined length of your first and last name must not exceed 30 characters.` rather than the specified fullname message |
| Duplicate registration message | 1 | Application says `Please use a different account ID.` rather than `Please choose another.` |
| Registration success alert | 1 | Application alerts `Registration successful!` rather than `success` |
| Decimal deposit/withdrawal/transfer/bill payment | 4 | Specified whole-number error label does not appear; native HTML validation blocks the decimal submission |
| Equal-balance withdrawal/transfer/bill payment | 3 | Specified rejection is absent; implementation permits equality whereas the PDF says amount must be less than balance |

Failures in this table are requirement mismatches, not 16 distinct underlying
bugs. Message mismatches do not imply an invalid account was created. Decimal
message failures do not imply a decimal transaction was persisted. The
equal-balance rule follows the PDF literally; changing it to allow equality
requires clarification of the requirement.

The original successful transaction flows, including S8's two-account transfer
and history checks, passed. Tests with valid rejection messages and unchanged
account state also pass. Application source has not been changed to hide failures.

Each test stops at its first failed assertion, so later assertions in that case
have not necessarily executed. This run does not establish exhaustive EQ coverage.

The result above records the previous full requirement run, before the later
reported `accountAfterReload` timeout. The current helper no longer waits for
that alias: it verifies a replacement document and rendered state against the
successful login/mutation response. Requirement assertions remain unchanged.
Focused verification of the current helper is provided by `npm run test:reload`.

Current focused regression result: **2 passed, 0 failed** (44 seconds). Both
normal and delayed real account responses passed repeated login, deposit,
withdrawal, bill payment, transfer and account switching (14 reloads total).
POST/PUT observers now use a unique one-request alias for each action, avoiding
responses left over from a previous action. The full 47-case requirement suite
has not been rerun after this latest helper change.
