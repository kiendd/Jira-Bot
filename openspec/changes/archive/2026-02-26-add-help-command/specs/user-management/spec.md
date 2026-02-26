# user-management Specification

## MODIFIED Requirements
### Requirement: Command Interface
The bot MUST support commands to manage the session, user preferences, and issue tracking scope.
- `/start`: Welcome message.
- `/help`: Show instructions and available commands.
- `/setup <host> <email> <token> [jql]`: Register credentials.
- `/status`: Check current monitoring status and active issue scope.
- `/settings`: Open the interactive configuration menu for preferences and issue scope.
- `/stop`: Stop monitoring.
- `/jql <query>`: Update the tracking scope with a custom Jira Query Language string.

#### Scenario: Display Help Instructions
- **GIVEN** any user (registered or not)
- **WHEN** they send `/help`
- **THEN** the bot replies with a formatted message explaining how to configure and use the bot.
