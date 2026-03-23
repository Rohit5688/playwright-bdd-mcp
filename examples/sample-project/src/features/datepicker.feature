Feature: JQuery UI Datepicker

  Scenario: Select a date in the inline datepicker
    Given I am on the jQuery UI Datepicker page
    When I select "Display inline" type of date picker
    And I choose date "5" "March" "1956" in the date picker
    Then I validate that "5" "March" "1956" is selected
    And I take a screenshot as "datepicker_inline_5th_march_1956"
