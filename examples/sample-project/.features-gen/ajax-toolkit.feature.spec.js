// Generated from: src\features\ajax-toolkit.feature
import { test } from "playwright-bdd";

test.describe('Ajax Toolkit demonstration', () => {

  test.describe('User navigates directly to Ajax Toolkit and types in HTML Editor', () => {

    test('Example #1', async ({ Given, Then, And, page }) => { 
      await Given('I navigate directly to "https://www.ajaxtoolkit.net/HTMLEditor/HTMLEditor.aspx"', null, { page }); 
      await Then('I clear the demo text and type "This is typed by My AWSM MCP server" in the editor', null, { page }); 
      await And('I verify the text "This is typed by My AWSM MCP server" is visible in the editor', null, { page }); 
    });

  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('src\\features\\ajax-toolkit.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":8,"pickleLine":10,"tags":[],"steps":[{"pwStepLine":9,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I navigate directly to \"https://www.ajaxtoolkit.net/HTMLEditor/HTMLEditor.aspx\"","stepMatchArguments":[{"group":{"start":23,"value":"\"https://www.ajaxtoolkit.net/HTMLEditor/HTMLEditor.aspx\"","children":[{"start":24,"value":"https://www.ajaxtoolkit.net/HTMLEditor/HTMLEditor.aspx","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then I clear the demo text and type \"This is typed by My AWSM MCP server\" in the editor","stepMatchArguments":[{"group":{"start":31,"value":"\"This is typed by My AWSM MCP server\"","children":[{"start":32,"value":"This is typed by My AWSM MCP server","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"And I verify the text \"This is typed by My AWSM MCP server\" is visible in the editor","stepMatchArguments":[{"group":{"start":18,"value":"\"This is typed by My AWSM MCP server\"","children":[{"start":19,"value":"This is typed by My AWSM MCP server","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end