# User Management

## MODIFIED Requirements

### Requirement: Command Interface
The bot MUST support commands to manage the session and user preferences.
- `/start`: Welcome message.
- `/setup <host> <email> <token> [jql]`: Register credentials.
- `/status`: Check current monitoring status.
- `/settings`: Open the interactive configuration menu for preferences.
- `/stop`: Stop monitoring.

#### Scenario: Open Settings
- **GIVEN** an active user
- **WHEN** they send `/settings`
- **THEN** the bot replies with an interactive inline keyboard containing their tracking toggles and quiet hour configurations.
