# jira-integration Specification

## ADDED Requirements

### Requirement: Interactive Operations
The bot MUST be able to execute writes and state-changes to Jira issues using the user's stored authentication tokens. Specifically, the bot MUST be able to add a comment to a specific issue, assign an issue to the current user, fetch available status transitions, and execute a status transition.

#### Scenario: Add Comment
- **GIVEN** a user provides comment text for an issue via Telegram
- **WHEN** the bot receives the text
- **THEN** it makes an API call to Jira using the user's token to append the comment to the issue.

#### Scenario: Assign to Current User
- **GIVEN** a user clicks the "Assign to Me" button in Telegram
- **WHEN** the bot processes the action
- **THEN** it looks up the user's Jira account ID using their configured email/token and makes an API call to assign the issue to them.

#### Scenario: Fetch and Execute Transitions
- **GIVEN** a user wants to change an issue's status
- **WHEN** the bot needs to display options
- **THEN** it fetches the list of valid transitions for the issue from Jira.
- **WHEN** the user selects a transition
- **THEN** the bot executes that transition API call against Jira.
