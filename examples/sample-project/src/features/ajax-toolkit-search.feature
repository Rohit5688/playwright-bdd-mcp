@google @ajax
Feature: Ajax Toolkit Search and Edit

  Scenario: Search Ajax Toolkit on Google and use editor
    Given I navigate to Google
    When I search for "ajax toolkit"
    And I open the "ASP.NET AJAX Control Toolkit" link from the search results
    And I navigate to the HTMLEditor section
    And I clear the demo text and type "I am writing this on behalf of Rohit" in the editor
    Then I verify the text "I am writing this on behalf of Rohit" is visible in the editor
