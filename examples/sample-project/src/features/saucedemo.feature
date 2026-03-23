Feature: SauceDemo Login

  Scenario Outline: Successful login with valid credentials
    Given I am on the SauceDemo login page
    When I log in with username "<username>" and password "<password>"
    Then I should see the products inventory page

    Examples:
      | username      | password     |
      | standard_user | secret_sauce |
