## ADDED Requirements
### Requirement: New Issue Detection
The bot MUST detect when an issue first enters the user's JQL results and notify the user. When an issue has no previous state in the database, the bot MUST evaluate if the issue is a genuine new task (e.g., recently created or recently assigned) and send a notification indicating a "New Task", rather than suppressing it as a silent baseline. 

#### Scenario: Newly Assigned Task
- **GIVEN** a new issue is created or assigned to the user
- **WHEN** the bot polls and finds the issue has no previous state in the database, but realizes the user is not in the first-poll baseline phase
- **THEN** the bot records the baseline state AND triggers a "New Task" notification for the issue.
