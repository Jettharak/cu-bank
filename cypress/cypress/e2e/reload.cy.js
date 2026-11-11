const { waitForAccountReload } = require('../support/account-reload');
const API = 'http://localhost:4000/api/v1';
const field = (cid) => cy.get(`[cid="${cid}"]`);
let requestSequence = 0;

function createAccount() {
  const accountId = String(Cypress._.random(1000000000, 9999999999));
  return cy.request('POST', `${API}/auth/register`, {
    accountId, password: '1234', name: `Reload ${accountId}`,
  }).then(({ body }) => ({ accountId, token: body.token }));
}

function login(account) {
  cy.clearLocalStorage();
  cy.visit('/');
  const alias = `reloadLogin${++requestSequence}`;
  cy.intercept({ method: 'POST', url: `${API}/auth/login`, times: 1 }).as(alias);
  field('l1').type(account.accountId);
  field('l2').type('1234', { log: false });
  waitForAccountReload(() => {
    field('lc').click();
    return cy.wait(`@${alias}`).then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.body.success).to.eq(true);
      return response.body.user;
    });
  });
}

function transact(input, button, amount) {
  const alias = `reloadMutation${++requestSequence}`;
  cy.intercept({ method: 'PUT', url: `${API}/transactions/`, times: 1 }).as(alias);
  waitForAccountReload(() => {
    field(input).type(String(amount));
    field(button).click();
    return cy.wait(`@${alias}`).then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.body.success).to.eq(true);
      return response.body.data;
    });
  });
}

describe('Account reload synchronization regression', () => {
  [0, 750].forEach((delay) => {
    it(`survives repeated reloads and account switching (real GET delay ${delay}ms)`, () => {
      if (delay) {
        // Delay the real response, without replacing its status or body.
        cy.intercept({ method: 'GET', url: `${API}/transactions/`, middleware: true }, (request) => {
          request.on('response', (response) => response.setDelay(delay));
        });
      }
      createAccount().then((sender) => {
        createAccount().then((recipient) => {
          login(sender);
          transact('d1', 'dc', 1000);
          transact('w1', 'wc', 200);
          field('b1').check();
          transact('b4', 'bc', 100);
          field('t1').type(recipient.accountId);
          transact('t2', 'tc', 300);
          cy.contains('h2', /^Balance:$/).next('h1').should('have.text', '400');
          cy.get('.history-list h2').should('have.length', 5);
          login(recipient);
          cy.contains('h2', /^Balance:$/).next('h1').should('have.text', '300');
          cy.get('.history-list h2').should('have.length', 2);
          cy.get('.history-list').contains('h2', 'transfer from').should('be.visible');
          login(sender);
          cy.contains('h2', /^Balance:$/).next('h1').should('have.text', '400');
          cy.get('.history-list h2').should('have.length', 5);
          cy.request({
            url: `${API}/transactions/`,
            headers: { Authorization: `Bearer ${sender.token}` },
          }).its('body.data').should((data) => {
            expect(data.balance).to.eq(400);
            expect(data.transactions).to.have.length(4);
            expect(data.transactions[3]).to.include({ title: 'transfer to', target: recipient.accountId, amount: 300 });
          });
        });
      });
    });
  });
});
