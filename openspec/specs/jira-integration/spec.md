# jira-integration Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: Connection
The bot MUST connect to a Jira Cloud instance using **User-provided** Email and API Token. The bot MUST fail gracefully if authentication fails for a specific user without affecting others.

#### Scenario: Successful Connection
- **GIVEN** a registered user with valid `host`, `email`, and `token`
- **WHEN** the bot starts polling for that user
- **THEN** it should successfully verify credentials.

### Requirement: Fetching
The bot MUST be able to execute JQL queries to fetch issues. The bot SHOULD fetch fields: `updated`, `summary`, `status`, `assignee`. The bot MUST handle pagination if more than 50 issues are updated. The bot MUST also detect new attachments via the Jira `changelog` and MUST be able to download the raw file streams/buffers securely from Jira using the user's authentication token to be forwarded to notifications.

#### Scenario: Secure Attachment Download
- **GIVEN** an issue has a new attachment added
- **WHEN** the bot detects the attachment in the changelog
- **THEN** it uses its configured authentication tokens to download the file directly from Jira's servers.

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

