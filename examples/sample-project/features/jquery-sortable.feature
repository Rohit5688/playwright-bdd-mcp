Feature: jQuery UI Sortable

  Scenario: User reorders sortable list items using drag and drop
    Given I navigate directly to "https://jqueryui.com/sortable/"
    When I drag sortable item 7 to the position of item 3
    And I drag sortable item 1 to the position of item 6
    Then I verify the sortable list has been reordered correctly
