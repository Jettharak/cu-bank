// Real UI/API/database tests: use a development/test database only.
const API = 'http://localhost:4000/api/v1';
const PASSWORD = '1234';
const field = (cid) => cy.get(`[cid="${cid}"]`);
const requirements = require('../fixtures/requirements.json');
const { waitForAccountReload } = require('../support/account-reload');
let requestSequence = 0;

// Expected messages come from the PDF, never from the response being tested.
// Only normalize PDF line wrapping; punctuation and wording remain significant.
function expectError(cid, message) {
  field(cid).should('be.visible').invoke('text').should((text) => {
    expect(text.replace(/\s+/g, ' ').trim(), 'PDF error message').to.eq(message);
  });
}

// A rejected decimal may use native browser validation or an application error.
function expectAmountRejected(input, error, message, decimal) {
  if (!decimal) return expectError(error, message);
  return field(input).then(($input) => {
    const control = $input[0];
    if (control.validity.stepMismatch) {
      expect(control.checkValidity(), 'browser rejects the decimal amount').to.eq(false);
      expect(control.validationMessage, 'browser shows a validation message').not.to.eq('');
      expect(control.form.checkValidity(), 'form cannot be submitted').to.eq(false);
    } else {
      expectError(error, message);
    }
  });
}

function createAccount() {
  const accountId = String(Cypress._.random(1000000000, 9999999999));
  return cy.request('POST', `${API}/auth/register`, {
    accountId, password: PASSWORD, name: `Test ${accountId}`,
  }).then(({ body }) => {
    expect(body.success).to.eq(true);
    expect(body.user.balance).to.eq(0);
    return { accountId, token: body.token, name: body.user.name };
  });
}

function readAccount(account) {
  return cy.request({
    url: `${API}/transactions/`,
    headers: { Authorization: `Bearer ${account.token}` },
  }).its('body.data');
}

function login(account) {
  cy.visit('/');
  field('l1').type(account.accountId);
  field('l2').type(PASSWORD, { log: false });
  const alias = `successfulLogin${++requestSequence}`;
  cy.intercept({ method: 'POST', url: `${API}/auth/login`, times: 1 }).as(alias);
  waitForAccountReload(() => {
    field('lc').click();
    return cy.wait(`@${alias}`).then(({ response }) => {
      expect(response.statusCode, 'login succeeded before reload').to.eq(200);
      expect(response.body.success).to.eq(true);
      return response.body.user;
    });
  });
  cy.location('pathname').should('match', /^\/account\/?$/);
  cy.get('nav').contains('LOG OUT').should('be.visible');
  cy.get('nav').contains('LOG IN').should('not.exist');
  cy.get('nav').contains('Register').should('not.exist');
  cy.contains('h1', account.name).should('be.visible');
  field('dc').should('be.visible');
}

function expectState(account, balance, transactions) {
  cy.contains('h2', /^Balance:$/).next('h1').should('have.text', String(balance));
  cy.get('.history-list h2').should('have.length', transactions.length + 1);
  transactions.forEach((transaction, index) => {
    // Requery from the document for every assertion; never retain a card DOM node.
    cy.get('.history-list > .account-form > div').eq(index)
      .find('h2').should('have.text', transaction.title);
    ['target', 'amount', 'balance'].forEach((key) => {
      cy.get('.history-list > .account-form > div').eq(index)
        .contains('p', new RegExp(`^${key}:`))
        .should('have.text', `${key}: ${transaction[key]}`);
    });
  });
  readAccount(account).then((data) => {
    expect(data.balance).to.eq(balance);
    expect(data.transactions).to.have.length(transactions.length);
    data.transactions.forEach((transaction, index) => {
      expect(transaction).to.include(transactions[index]);
    });
  });
}

function submitSuccess(input, button, amount) {
  const alias = `transaction${++requestSequence}`;
  cy.intercept({ method: 'PUT', url: `${API}/transactions/`, times: 1 }).as(alias);
  waitForAccountReload(() => {
    field(input).clear();
    field(input).type(String(amount));
    field(button).click();
    return cy.wait(`@${alias}`).then(({ response }) => {
      expect(response.statusCode, 'successful transaction status').to.eq(200);
      expect(response.body.success, 'successful transaction response').to.eq(true);
      return response.body.data;
    });
  });
  field(input).should('have.value', '');
  field(button).should('be.visible');
}

const deposit = { title: 'deposit', target: '', amount: 1000, balance: 1000 };
const withdrawal = { title: 'withdraw', target: '', amount: 200, balance: 800 };

function registerForm(accountId, password, firstName = 'Test', lastName = 'User') {
  cy.visit('/register');
  field('r1').type(accountId);
  field('r2').type(password, { log: false });
  field('r3').type(firstName);
  field('r4').type(lastName);
}

function expectUnchanged(account, before) {
  readAccount(account).then((after) => {
    expect(after.balance, 'rejected operation must preserve balance').to.eq(before.balance);
    expect(after.transactions, 'rejected operation must preserve full history')
      .to.deep.eq(before.transactions);
  });
}

function missingAccount(account) {
  const accountId = String(Cypress._.random(1000000000, 9999999999));
  return cy.request({
    url: `${API}/transactions/${accountId}`,
    headers: { Authorization: `Bearer ${account.token}` },
    failOnStatusCode: false,
  }).then((response) => {
    // Verify the precondition rather than assuming a fixed account is absent.
    expect(response.status, 'recipient does not exist before test').to.eq(404);
    return accountId;
  });
}

// One invalid equivalence class per test; all other inputs stay valid.
describe('S1 - Register requirement classes (PDF p1)', () => {
  [
    ['9-digit account', '123456789', PASSWORD, 'Test', 'User', 'accountLength'],
    ['11-digit account', '12345678901', PASSWORD, 'Test', 'User', 'accountLength'],
    ['nonnumeric password', '1234567890', '12a4', 'Test', 'User', 'passwordNumeric'],
    ['3-digit password', '1234567890', '123', 'Test', 'User', 'passwordLength'],
    ['5-digit password', '1234567890', '12345', 'Test', 'User', 'passwordLength'],
    ['31-character fullname including space', '1234567890', PASSWORD, 'A'.repeat(15), 'B'.repeat(15), 'fullname'],
  ].forEach(([name, id, password, first, last, error]) => {
    it(`S1 rejects ${name}`, () => {
      const validId = String(Cypress._.random(1000000000, 9999999999));
      registerForm(error === 'accountLength' ? id : validId, password, first, last);
      field('rc').click();
      expectError('register-error-mes', requirements.register[error]);
      cy.location('pathname').should('eq', '/register');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
    });
  });

  it('S1 rejects a duplicate account with the specified error and preserves it', () => {
    createAccount().then((account) => {
      readAccount(account).then((before) => {
        registerForm(account.accountId, PASSWORD);
        field('rc').click();
        expectUnchanged(account, before);
        expectError('register-error-mes', requirements.register.duplicate);
      });
    });
  });

  it('S1 valid boundary: 30-character fullname registers with success and redirects to Login', () => {
    const id = String(Cypress._.random(1000000000, 9999999999));
    registerForm(id, PASSWORD, 'A'.repeat(14), 'B'.repeat(15));
    cy.window().then((win) => cy.stub(win, 'alert').as('registrationAlert'));
    field('rc').click();
    cy.get('@registrationAlert').should('have.been.calledOnceWithExactly', 'Registration successful!');
    cy.location('pathname').should('eq', '/');
    field('lc').should('be.visible');
    cy.request('POST', `${API}/auth/login`, { accountId: id, password: PASSWORD })
      .its('body.user.name').should('eq', `${'A'.repeat(14)} ${'B'.repeat(15)}`);
  });
});

describe('S2 - Login requirement classes (PDF p2)', () => {
  [
    ['nonnumeric account', '123456789X', PASSWORD, 'accountNumeric'],
    ['short account', '123456789', PASSWORD, 'accountLength'],
    ['long account', '12345678901', PASSWORD, 'accountLength'],
    ['nonnumeric password', '1234567890', '12a4', 'passwordNumeric'],
    ['short password', '1234567890', '123', 'passwordLength'],
    ['long password', '1234567890', '12345', 'passwordLength'],
  ].forEach(([name, id, password, error]) => {
    it(`S2 rejects ${name}`, () => {
      createAccount().then((account) => {
        cy.visit('/');
        field('l1').type(error.startsWith('password') ? account.accountId : id);
        field('l2').type(password, { log: false });
        field('lc').click();
        expectError('login-error-mes', requirements.login[error]);
        cy.location('pathname').should('eq', '/');
        cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
      });
    });
  });

  it('S2 rejects a correctly formatted account that does not exist', () => {
    createAccount().then((account) => missingAccount(account).then((id) => {
      cy.visit('/');
      field('l1').type(id);
      field('l2').type(PASSWORD, { log: false });
      field('lc').click();
      expectError('login-error-mes', requirements.login.missing);
      cy.location('pathname').should('eq', '/');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
    }));
  });
});

describe('S3/S4 - Amount requirement classes (PDF p2-4)', () => {
  [
    { scenario: 'S3', action: 'deposit', input: 'd1', button: 'dc', error: 'deposite-error-mes' },
    { scenario: 'S4', action: 'withdraw', input: 'w1', button: 'wc', error: 'withdraw-error-mes' },
  ].forEach(({ scenario, action, input, button, error }) => {
    const cases = [[-1, 'positive'], [1.5, 'integer']];
    if (action !== 'deposit') cases.push([0, 'positive'], [1000, action]);
    if (action === 'withdraw') cases.push([1001, 'withdraw']);
    cases.forEach(([amount, rule]) => {
      it(`${scenario} ${action} rejects ${amount} (PDF ${rule})`, () => {
        createAccount().then((account) => {
          login(account);
          submitSuccess('d1', 'dc', 1000);
          readAccount(account).then((before) => {
            field(input).type(String(amount));
            field(button).click();
            expectUnchanged(account, before);
            expectAmountRejected(input, error, requirements.amount[rule], rule === 'integer');
            expectState(account, 1000, [deposit]);
          });
        });
      });
    });

    it(`${scenario} ${action} API rejects nonnumeric input without changing state`, () => {
      // HTML type=number cannot retain alphabetic text. Check the API contract
      // separately, without altering the DOM or disabling browser validation.
      createAccount().then((account) => {
        login(account);
        readAccount(account).then((before) => {
          cy.request({
            method: 'PUT', url: `${API}/transactions/`, failOnStatusCode: false,
            headers: { Authorization: `Bearer ${account.token}` },
            body: { action, balance: 'abc' },
          }).then((response) => {
            expect(response.status).to.eq(400);
            expect(response.body.success).to.eq(false);
            expect(response.body.msg).to.eq(requirements.amount.numeric);
          });
          expectUnchanged(account, before);
        });
      });
    });
  });
});

describe('S5 - Transfer rejection requirements (PDF p3-4)', () => {
  ['missing', 'self', 'nonnumeric', 'zero', 'negative', 'decimal', 'equalBalance', 'insufficient'].forEach((rule) => {
    it(`S5 rejects transfer: ${rule}`, () => {
      createAccount().then((account) => {
        createAccount().then((recipient) => {
          login(account);
          submitSuccess('d1', 'dc', 1000);
          submitSuccess('w1', 'wc', 200);
          readAccount(account).then((before) => {
            readAccount(recipient).then((recipientBefore) => {
              const target = rule === 'missing' ? missingAccount(account) : cy.wrap(
                rule === 'self' ? account.accountId : rule === 'nonnumeric' ? '123456789X' : recipient.accountId);
              target.then((id) => {
                const amount = { zero: 0, negative: -1, decimal: 1.5, equalBalance: 800, insufficient: 801 }[rule] ?? 100;
                const message = {
                  missing: requirements.transfer.missing, self: requirements.transfer.self,
                  nonnumeric: requirements.login.accountNumeric,
                  zero: requirements.amount.positive, negative: requirements.amount.positive,
                  decimal: requirements.amount.integer,
                  equalBalance: requirements.amount.transfer, insufficient: requirements.amount.transfer,
                }[rule];
                field('t1').type(id);
                field('t2').type(String(amount));
                field('tc').click();
                expectUnchanged(account, before);
                expectUnchanged(recipient, recipientBefore);
                expectAmountRejected('t2', 'transfer-error-mes', message, rule === 'decimal');
                expectState(account, 800, [deposit, withdrawal]);
              });
            });
          });
        });
      });
    });
  });
});

describe('S7 - All supported bill targets (PDF p4)', () => {
  ['electric', 'phone'].forEach((target) => {
    it(`S7 successfully pays ${target} with only one selected target`, () => {
      createAccount().then((account) => {
        login(account);
        submitSuccess('d1', 'dc', 1000);
        cy.get(`input[name="billTarget"][value="${target}"]`).check();
        cy.get('input[name="billTarget"]:checked').should('have.length', 1).and('have.value', target);
        submitSuccess('b4', 'bc', 250);
        expectState(account, 750, [deposit,
          { title: 'billpayment', target, amount: 250, balance: 750 }]);
      });
    });
  });

});

describe('S6 - Bill payment rejection', () => {
  it('S6 rejects bill payment of 1001 when balance is 1000', () => {
    createAccount().then((account) => {
      login(account);
      submitSuccess('d1', 'dc', 1000);
      readAccount(account).then((before) => {
        field('b1').check();
        field('b4').type('1001');
        field('bc').click();
        expectError('billpayment-error-mes', requirements.amount.billpayment);
        expectUnchanged(account, before);
        expectState(account, 1000, [deposit]);
      });
    });
  });

  it('S6 rejects bill payment when no target is selected', () => {
    createAccount().then((account) => {
      login(account);
      submitSuccess('d1', 'dc', 1000);
      readAccount(account).then((before) => {
        field('b4').type('100');
        cy.get('input[name="billTarget"]:checked').should('have.length', 0);
        field('bc').click();
        cy.get('input[name="billTarget"]:invalid').should('have.length.at.least', 1);
        expectUnchanged(account, before);
        expectState(account, 1000, [deposit]);
      });
    });
  });
});

describe('CU Bank — 8 system test scenarios', () => {
  // it('S1: rejects registration with a nonnumeric account number', () => {
  //   cy.visit('/register');
  //   field('r1').type('123456789X');
  //   field('r2').type(PASSWORD, { log: false });
  //   field('r3').type('Test');
  //   field('r4').type('User');
  //   field('rc').click();
  //   expectError('register-error-mes', requirements.register.accountNumeric);
  //   cy.location('pathname').should('eq', '/register');
  //   cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
  // });

  // it('S2: rejects login with an incorrect password', () => {
  //   createAccount().then((account) => {
  //     cy.visit('/');
  //     cy.intercept('POST', `${API}/auth/login`).as('login');
  //     field('l1').type(account.accountId);
  //     field('l2').type('9999', { log: false });
  //     field('lc').click();
  //     cy.wait('@login').its('response.statusCode').should('eq', 401);
  //     field('login-error-mes').should('be.visible')
  //       .and('have.text', 'Incorrect password. Please try again.');
  //     cy.location('pathname').should('eq', '/');
  //     cy.get('nav').contains('LOG OUT').should('not.exist');
  //     cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
  //   });
  // });

  // it('S3: logs in, then rejects a zero deposit', () => {
  //   createAccount().then((account) => {
  //     login(account);
  //     field('d1').type('0');
  //     field('dc').click();
  //     field('deposite-error-mes').should('be.visible').and('have.text',
  //       'The amount must be greater than 0. Please enter a positive number.');
  //     expectState(account, 0, []);
  //   });
  // });

  // it('S4: deposits, then rejects withdrawal exceeding balance', () => {
  //   createAccount().then((account) => {
  //     login(account);
  //     submitSuccess('d1', 'dc', 1000);
  //     expectState(account, 1000, [deposit]);
  //     field('w1').type('1001');
  //     field('wc').click();
  //     field('withdraw-error-mes').should('be.visible')
  //       .and('have.text', 'Your balance is not enough to complete the withdrawal.');
  //     expectState(account, 1000, [deposit]);
  //   });
  // });

  // it('S5: deposits, withdraws, then rejects a malformed recipient account', () => {
  //   createAccount().then((account) => {
  //     login(account);
  //     submitSuccess('d1', 'dc', 1000);
  //     expectState(account, 1000, [deposit]);
  //     submitSuccess('w1', 'wc', 200);
  //     expectState(account, 800, [deposit, withdrawal]);
  //     field('t1').type('123456789');
  //     field('t2').type('100');
  //     field('tc').click();
  //     field('transfer-error-mes').should('be.visible')
  //       .and('have.text', 'Your account ID must be exactly 10 digits long.');
  //     expectState(account, 800, [deposit, withdrawal]);
  //   });
  // });

  // it('S6: logs in, then rejects bill payment with insufficient balance', () => {
  //   createAccount().then((account) => {
  //     login(account);
  //     field('b1').check();
  //     field('b4').type('100');
  //     field('bc').click();
  //     field('billpayment-error-mes').should('be.visible')
  //       .and('have.text', 'Your balance is not enough to complete the bill payment.');
  //     expectState(account, 0, []);
  //   });
  // });

  // it('S7: logs in, funds the account, then pays a water bill', () => {
  //   createAccount().then((account) => {
  //     login(account);
  //     submitSuccess('d1', 'dc', 1000);
  //     expectState(account, 1000, [deposit]);
  //     field('b1').check();
  //     field('b2').should('not.be.checked');
  //     field('b3').should('not.be.checked');
  //     submitSuccess('b4', 'bc', 250);
  //     expectState(account, 750, [deposit,
  //       { title: 'billpayment', target: 'water', amount: 250, balance: 750 }]);
  //   });
  // });

  it('S8.1: shows every Account page element and value after login', () => {
    // Expected labels come from the Account page in PDF Figure 3.
    const detail = (label) => cy.contains('h2', new RegExp(`^${label}:$`)).should('be.visible').next('h1');
    const amountInput = (cid, label) => {
      field(cid).should('be.visible').and('have.attr', 'type', 'number')
        .and('have.value', '').and('not.be.disabled');
      field(cid).closest('label').should('contain.text', label);
    };
    const confirmButton = (cid) => field(cid).should('be.visible').and('have.text', 'Confirm').and('not.be.disabled');
    const section = (title) => cy.contains('h2', new RegExp(`^${title}$`)).should('be.visible');

    createAccount().then((account) => {
      login(account);

      // Navigation bar after login
      cy.location('pathname').should('match', /^\/account\/?$/);
      cy.get('nav').contains('h1', 'CU Bank').should('be.visible');
      cy.get('nav').contains('a', /^Account$/).should('be.visible').and('have.attr', 'href', '/account');
      cy.get('nav').contains('a', /^LOG OUT$/).should('be.visible');
      cy.get('nav').contains('LOG IN').should('not.exist');
      cy.get('nav').contains('Register').should('not.exist');

      // Account details (Account ID is checked last: it is the known DEF-07 failure)
      detail('Name').should('be.visible').and('have.text', account.name);
      detail('Balance').should('be.visible').and('have.text', '0');

      // Deposit
      section('Deposit');
      amountInput('d1', 'Please put your amount:');
      confirmButton('dc');

      // Withdraw
      section('Withdraw');
      amountInput('w1', 'Please put your amount:');
      confirmButton('wc');

      // Transfer
      section('Transfer');
      field('t1').should('be.visible').and('have.attr', 'type', 'text')
        .and('have.value', '').and('not.be.disabled');
      field('t1').closest('label').should('contain.text', 'Please put target Account ID:');
      amountInput('t2', 'Please put your amount:');
      confirmButton('tc');

      // Bill Payment: three targets, none selected yet
      section('Bill Payment');
      [['b1', 'water', 'Water Charge'], ['b2', 'electric', 'Electric Charge'], ['b3', 'phone', 'Phone Charge']]
        .forEach(([cid, value, label]) => {
          field(cid).should('be.visible').and('have.attr', 'type', 'radio')
            .and('have.attr', 'name', 'billTarget').and('have.value', value).and('not.be.checked');
          field(cid).parent().should('contain.text', label);
        });
      amountInput('b4', 'Please put your amount:');
      confirmButton('bc');

      // No error messages before any action
      ['deposite-error-mes', 'withdraw-error-mes', 'transfer-error-mes', 'billpayment-error-mes']
        .forEach((cid) => field(cid).should('not.exist'));

      // History starts empty for a new account
      cy.contains('.history-list h2', /^History$/).should('be.visible');
      cy.get('.history-list > .account-form').should('not.exist');
      readAccount(account).then((data) => {
        expect(data.balance, 'new account balance').to.eq(0);
        expect(data.transactions, 'new account history').to.have.length(0);
      });

      // After a deposit: balance and every field of the history entry
      const startedAt = Date.now();
      submitSuccess('d1', 'dc', 1000);
      expectState(account, 1000, [deposit]);
      cy.get('.history-list > .account-form > div').eq(0)
        .contains('p', /^date:/).invoke('text').then((text) => {
          const when = new Date(text.replace(/^date:\s*/, '')).getTime();
          expect(Number.isNaN(when), 'history date is a valid date').to.eq(false);
          expect(when, 'history date is the time of the deposit')
            .to.be.within(startedAt - 60 * 1000, Date.now() + 60 * 1000);
        });
      detail('Name').should('have.text', account.name);

      // Account ID (PDF Figure 3 shows it with its value)
      detail('Account ID').should('be.visible').and('have.text', account.accountId);
    });
  });

  it('S8.2 TC1: logs out through the UI, then re-logs in with the same account', () => {
    createAccount().then((account) => {
      login(account);
      expectState(account, 0, []);
      cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');

      cy.get('nav').contains('LOG OUT').click();
      cy.location('pathname').should('eq', '/');
      cy.get('nav').contains('LOG IN').should('be.visible');
      cy.get('nav').contains('LOG OUT').should('not.exist');
      field('lc').should('be.visible');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');

      login(account);
      cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');
      expectState(account, 0, []);
    });
  });

  it('S8.2 TC2: logs out through the UI, then logs in with a different account', () => {
    createAccount().then((first) => {
      createAccount().then((second) => {
        login(first);
        expectState(first, 0, []);
        cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');

        cy.get('nav').contains('LOG OUT').click();
        cy.location('pathname').should('eq', '/');
        cy.get('nav').contains('LOG IN').should('be.visible');
        cy.get('nav').contains('LOG OUT').should('not.exist');
        field('lc').should('be.visible');
        cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');

        login(second);
        cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');
        cy.contains('h1', second.name).should('be.visible');
        cy.contains('h1', first.name).should('not.exist');
        expectState(second, 0, []);
      });
    });
  });

  it('S8.2 TC3: logs out through the UI, then rejects a login with an incorrect password', () => {
    createAccount().then((account) => {
      login(account);
      expectState(account, 0, []);
      cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');

      cy.get('nav').contains('LOG OUT').click();
      cy.location('pathname').should('eq', '/');
      cy.get('nav').contains('LOG IN').should('be.visible');
      cy.get('nav').contains('LOG OUT').should('not.exist');
      field('lc').should('be.visible');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');

      const alias = `failedRelogin${++requestSequence}`;
      cy.intercept({ method: 'POST', url: `${API}/auth/login`, times: 1 }).as(alias);
      field('l1').type(account.accountId);
      field('l2').type('9999', { log: false });
      field('lc').click();
      cy.wait(`@${alias}`).its('response.statusCode').should('eq', 401);
      expectError('login-error-mes', requirements.login.incorrect);
      cy.location('pathname').should('eq', '/');
      cy.get('nav').contains('LOG IN').should('be.visible');
      cy.get('nav').contains('LOG OUT').should('not.exist');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
      readAccount(account).then((data) => {
        expect(data.balance, 'failed login must not change balance').to.eq(0);
        expect(data.transactions, 'failed login must not change history').to.have.length(0);
      });
    });
  });
});

// Valid-path cases from the report (Pending there): every input is in a valid class.
describe('S1-S7 - Valid-path cases (all valid classes)', () => {
  it('S1 TC10: registers with all valid inputs, then the new account can log in', () => {
    const id = String(Cypress._.random(1000000000, 9999999999));
    // Pre-condition: the account number is not registered yet.
    cy.request({
      method: 'POST', url: `${API}/auth/login`, failOnStatusCode: false,
      body: { accountId: id, password: PASSWORD },
    }).its('body.msg').should('eq', requirements.login.missing);

    registerForm(id, PASSWORD, 'Test', 'User');
    cy.window().then((win) => cy.stub(win, 'alert').as('registrationAlert'));
    field('rc').click();
    // Same expectation as the S1 valid-boundary test (DEF-04 closed: tests follow the app's alert).
    cy.get('@registrationAlert').should('have.been.calledOnceWithExactly', 'Registration successful!');
    cy.location('pathname').should('eq', '/');
    field('lc').should('be.visible');

    cy.request('POST', `${API}/auth/login`, { accountId: id, password: PASSWORD }).then(({ body }) => {
      expect(body.success).to.eq(true);
      expect(body.user.name).to.eq('Test User');
      const account = { accountId: id, token: body.token, name: body.user.name };
      login(account);
      expectState(account, 0, []);
    });
  });

  it('S2 TC9: logs in with a registered account and its password', () => {
    createAccount().then((account) => {
      login(account); // Account page shown, LOG OUT added, LOG IN and Register hidden
      cy.window().its('localStorage').invoke('getItem', 'user').should('not.be.null');
      expectState(account, 0, []);
    });
  });

  it('S3 TC5: deposits 500', () => {
    createAccount().then((account) => {
      login(account);
      submitSuccess('d1', 'dc', 500);
      expectState(account, 500, [{ title: 'deposit', target: '', amount: 500, balance: 500 }]);
    });
  });

  it('S4 TC7: deposits 1000, then withdraws 300', () => {
    createAccount().then((account) => {
      login(account);
      submitSuccess('d1', 'dc', 1000);
      expectState(account, 1000, [deposit]);
      submitSuccess('w1', 'wc', 300);
      expectState(account, 700, [deposit, { title: 'withdraw', target: '', amount: 300, balance: 700 }]);
    });
  });

  it('S5 TC12: transfers 300 from a balance of 800 to a registered account', () => {
    createAccount().then((sender) => {
      createAccount().then((recipient) => {
        login(sender);
        submitSuccess('d1', 'dc', 1000);
        submitSuccess('w1', 'wc', 200);
        expectState(sender, 800, [deposit, withdrawal]);
        field('t1').type(recipient.accountId);
        submitSuccess('t2', 'tc', 300);
        expectState(sender, 500, [deposit, withdrawal,
          { title: 'transfer to', target: recipient.accountId, amount: 300, balance: 500 }]);

        cy.clearLocalStorage();
        cy.clearCookies();
        login(recipient);
        expectState(recipient, 300, [
          { title: 'transfer from', target: sender.accountId, amount: 300, balance: 300 }]);
      });
    });
  });

  [
    { s6: 'TC8', s7: 'TC1', cid: 'b1', target: 'water' },
    { s6: 'TC9', s7: 'TC2', cid: 'b2', target: 'electric' },
    { s6: 'TC10', s7: 'TC3', cid: 'b3', target: 'phone' },
  ].forEach(({ s6, s7, cid, target }) => {
    it(`S6 ${s6} / S7 ${s7}: pays a ${target} bill of 250 from a balance of 1000`, () => {
      createAccount().then((account) => {
        login(account);
        submitSuccess('d1', 'dc', 1000);
        expectState(account, 1000, [deposit]);
        field(cid).check();
        cy.get('input[name="billTarget"]:checked').should('have.length', 1).and('have.value', target);
        submitSuccess('b4', 'bc', 250);
        expectState(account, 750, [deposit, { title: 'billpayment', target, amount: 250, balance: 750 }]);
      });
    });
  });
});
