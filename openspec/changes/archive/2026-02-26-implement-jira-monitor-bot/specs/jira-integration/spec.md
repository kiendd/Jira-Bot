# Jira Integration

## ADDED Requirements

### Requirement: Connection
The bot MUST connect to a Jira Cloud instance using **User-provided** Email and API Token. The bot MUST fail gracefully if authentication fails for a specific user without affecting others.

#### Scenario: Successful Connection
- **GIVEN** a registered user with valid `host`, `email`, and `token`
- **WHEN** the bot starts polling for that user
- **THEN** it should successfully verify credentials.

### Requirement: Fetching
The bot MUST be able to execute JQL queries to fetch issues. The bot SHOULD fetch fields: `updated`, `summary`, `status`, `assignee`. The bot MUST handle pagination if more than 50 issues are updated.

#### Scenario: JQL Search
- **GIVEN** a JQL query "project = PROJ AND updated > -1d"
- **WHEN** the bot polls
- **THEN** it receives a list of issues modified in the last 24 hours.
