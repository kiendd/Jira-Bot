## MODIFIED Requirements

### Requirement: Command Interface
The bot MUST support commands to manage the session, user preferences, and issue tracking scope. The bot MUST allow users to interactively view and toggle subscriptions to specific Jira projects using inline keyboards.

#### Scenario: Scope Configuration Menu with Projects
- **GIVEN** an active user
- **WHEN** they open the settings menu and navigate to the project selection
- **THEN** the bot fetches the list of available projects from Jira AND displays them as toggleable inline buttons.
- **AND WHEN** the user toggles a project
- **THEN** the bot updates their `projectScopes` preferences AND rebuilds their tracking JQL to include the selected projects combined with their relationship scopes using `OR` logic.
