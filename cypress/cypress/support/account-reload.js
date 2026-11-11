const API = 'http://localhost:4000/api/v1';

// trigger must yield the account returned by the successful login/mutation.
// Readiness is established by the new document and its rendered state, not by
// the timing or number of GET requests (which varies with navigation/cache).
export function waitForAccountReload(trigger) {
  cy.document().then((previousDocument) => {
    cy.intercept({ method: 'GET', url: `${API}/transactions/`, middleware: true }, (request) => {
      delete request.headers['if-none-match'];
      delete request.headers['if-modified-since'];
      // No alias and no stubbed response. Allow other observers to run, too.
    });
    trigger().then((account) => {
      expect(account.name, 'successful response contains an account name').to.be.a('string').and.not.be.empty;
      expect(account.balance, 'successful response contains a numeric balance').to.be.a('number');
      expect(account.transactions, 'successful response contains history').to.be.an('array');
      cy.document({ timeout: Cypress.config('pageLoadTimeout') }).should((document) => {
        expect(document, 'reload replaced the previous document').not.to.eq(previousDocument);
      });
      const timeout = Cypress.config('responseTimeout');
      cy.location('pathname').should('match', /^\/account\/?$/);
      cy.contains('h2', /^Name:$/, { timeout }).next('h1', { timeout }).should('have.text', account.name);
      cy.contains('h2', /^Balance:$/, { timeout }).next('h1', { timeout })
        .should('have.text', String(account.balance));
      cy.get('.history-list h2', { timeout }).should('have.length', account.transactions.length + 1);
      cy.get('[cid="dc"]', { timeout }).should('be.visible');
    });
  });
}
