# User Management

## MODIFIED Requirements

### Requirement: Command Interface
The bot MUST support commands to manage the session, user preferences, and issue tracking scope.
- `/start`: Welcome message.
- `/setup <host> <email> <token> [jql]`: Register credentials.
- `/status`: Check current monitoring status and active issue scope.
- `/settings`: Open the interactive configuration menu for preferences and issue scope.
- `/stop`: Stop monitoring.
- `/jql <query>`: Update the tracking scope with a custom Jira Query Language string.

#### Scenario: Scope Configuration Menu
- **GIVEN** an active user
- **WHEN** they send `/settings`
- **THEN** the interactive menu includes quick-filter buttons for standard scopes (e.g., "My Issues", "Watched").

#### Scenario: Human-Readable Scope
- **GIVEN** a user configures their scope to "Watched Issues" via the settings menu
- **WHEN** they run the `/status` command
- **THEN** the bot displays the human-readable Scope title "👁️ Watched" instead of raw JQL.
