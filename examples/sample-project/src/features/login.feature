Feature: User Login

  @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I login as "admin" user
    Then I should see the dashboard
