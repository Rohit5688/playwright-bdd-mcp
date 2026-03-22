Feature: Ajax Toolkit demonstration
  
  Scenario Outline: User navigates directly to Ajax Toolkit and types in HTML Editor
    Given I navigate directly to "https://www.ajaxtoolkit.net/HTMLEditor/HTMLEditor.aspx"
    Then I clear the demo text and type "<Message>" in the editor
    And I verify the text "<Message>" is visible in the editor

    Examples:
      | Message                                 |
      | This is typed by My AWSM MCP server     |
