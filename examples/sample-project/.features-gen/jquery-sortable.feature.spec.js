// Generated from: src\features\jquery-sortable.feature
import { test } from "playwright-bdd";

test.describe('jQuery UI Sortable', () => {

  test('User reorders sortable list items using drag and drop', async ({ Given, When, Then, And, page }) => { 
    await Given('I navigate directly to "https://jqueryui.com/sortable/"', null, { page }); 
    await When('I drag sortable item 7 to the position of item 3', null, { page }); 
    await And('I drag sortable item 1 to the position of item 6', null, { page }); 
    await Then('I verify the sortable list has been reordered correctly', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('src\\features\\jquery-sortable.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I navigate directly to \"https://jqueryui.com/sortable/\"","stepMatchArguments":[{"group":{"start":23,"value":"\"https://jqueryui.com/sortable/\"","children":[{"start":24,"value":"https://jqueryui.com/sortable/","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I drag sortable item 7 to the position of item 3","stepMatchArguments":[{"group":{"start":21,"value":"7","children":[]},"parameterTypeName":"int"},{"group":{"start":47,"value":"3","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"And I drag sortable item 1 to the position of item 6","stepMatchArguments":[{"group":{"start":21,"value":"1","children":[]},"parameterTypeName":"int"},{"group":{"start":47,"value":"6","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then I verify the sortable list has been reordered correctly","stepMatchArguments":[]}]},
]; // bdd-data-end