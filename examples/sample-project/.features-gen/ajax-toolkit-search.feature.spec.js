// Generated from: src\features\ajax-toolkit-search.feature
import { test } from "playwright-bdd";

test.describe('Ajax Toolkit Search and Edit', () => {

  test('Search Ajax Toolkit on Google and use editor', { tag: ['@google', '@ajax'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I navigate to Google', null, { page }); 
    await When('I search for "ajax toolkit"', null, { page }); 
    await And('I open the "ASP.NET AJAX Control Toolkit" link from the search results', null, { page }); 
    await And('I navigate to the HTMLEditor section', null, { page }); 
    await And('I clear the demo text and type "I am writing this on behalf of Rohit" in the editor', null, { page }); 
    await Then('I verify the text "I am writing this on behalf of Rohit" is visible in the editor', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('src\\features\\ajax-toolkit-search.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@google","@ajax"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I navigate to Google","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When I search for \"ajax toolkit\"","stepMatchArguments":[{"group":{"start":13,"value":"\"ajax toolkit\"","children":[{"start":14,"value":"ajax toolkit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"And I open the \"ASP.NET AJAX Control Toolkit\" link from the search results","stepMatchArguments":[{"group":{"start":11,"value":"\"ASP.NET AJAX Control Toolkit\"","children":[{"start":12,"value":"ASP.NET AJAX Control Toolkit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"And I navigate to the HTMLEditor section","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"And I clear the demo text and type \"I am writing this on behalf of Rohit\" in the editor","stepMatchArguments":[{"group":{"start":31,"value":"\"I am writing this on behalf of Rohit\"","children":[{"start":32,"value":"I am writing this on behalf of Rohit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I verify the text \"I am writing this on behalf of Rohit\" is visible in the editor","stepMatchArguments":[{"group":{"start":18,"value":"\"I am writing this on behalf of Rohit\"","children":[{"start":19,"value":"I am writing this on behalf of Rohit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end