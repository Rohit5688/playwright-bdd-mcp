Feature: Sauce Demo Shop

  @demo
  Scenario: Add product to cart and checkout
    Given I am on the Saucedemo login page
    When I login with standard user
    And I add "Sauce Labs Backpack" to the cart
    Then the cart should show "1" item
