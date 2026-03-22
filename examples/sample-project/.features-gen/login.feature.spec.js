// Generated from: src\features\login.feature
import { test } from "playwright-bdd";

test.describe('User Login', () => {

  test('Successful login with valid credentials', { tag: ['@smoke'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I login as "admin" user', null, { page }); 
    await Then('I should see the dashboard', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('src\\features\\login.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I login as \"admin\" user","stepMatchArguments":[{"group":{"start":11,"value":"\"admin\"","children":[{"start":12,"value":"admin","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I should see the dashboard","stepMatchArguments":[]}]},
]; // bdd-data-end