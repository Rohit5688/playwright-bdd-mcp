// Generated from: features\saucedemo.feature
import { test } from "playwright-bdd";

test.describe('Sauce Demo Shop', () => {

  test('Add product to cart and checkout', { tag: ['@demo'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the Saucedemo login page', null, { page }); 
    await When('I login with standard user', null, { page }); 
    await And('I add "Sauce Labs Backpack" to the cart', null, { page }); 
    await Then('the cart should show "1" item', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features\\saucedemo.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@demo"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am on the Saucedemo login page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I login with standard user","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"And I add \"Sauce Labs Backpack\" to the cart","stepMatchArguments":[{"group":{"start":6,"value":"\"Sauce Labs Backpack\"","children":[{"start":7,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then the cart should show \"1\" item","stepMatchArguments":[{"group":{"start":21,"value":"\"1\"","children":[{"start":22,"value":"1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end