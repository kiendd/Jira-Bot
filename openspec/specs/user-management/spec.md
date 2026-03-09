# user-management Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: User Registration
The system MUST allow users to register their Jira credentials linked to their Telegram Chat ID.
The system MUST support multiple distinct users, each with their own Jira configuration and issue tracking state.

#### Scenario: Register New User
- **GIVEN** a new Telegram user starts a chat
- **WHEN** they send the setup command with credentials
- **THEN** the bot encrypts the token using AES-256 AND saves the mapping of Chat ID to Encrypted Credentials AND starts monitoring for that user.

### Requirement: Security
The system MUST encrypt sensitive data (API Tokens) at rest in the database.
The system MUST decrypt the token only when establishing a connection to Jira.

#### Scenario: Verify Encryption
- **GIVEN** a registered user
- **WHEN** inspecting the database directly
- **THEN** the API Token field appears as an opaque ciphertext, not plain text.

### Requirement: Persistence
The system MUST persist user configurations across restarts.

#### Scenario: Restart Persistence
- **GIVEN** User A has registered
- **WHEN** the bot restarts
- **THEN** it automatically resumes monitoring for User A without requiring re-registration.

### Requirement: Command Interface
The bot MUST allow users to select specific Jira projects to monitor.
When both Relationship Scopes and Project Scopes are defined, the system MUST combine them using logical `AND`.

#### Scenario: Project Subscription Isolation
- **GIVEN** a user has configured "Assigned to Me" and selected project "PROJ1"
- **WHEN** the bot builds the JQL for monitoring
- **THEN** the JQL enforces an `AND` intersection: `(assignee = currentUser()) AND project in ("PROJ1") AND updated > -1d`.
- **AND** the user does not receive notifications for unassigned issues in "PROJ1".

### Requirement: Configurable Ignored Fields
The system MUST allow users to configure a custom list of Jira fields they do NOT want to see in issue notifications.
The system MUST store these `ignoredFields` as an array of strings in the user's preferences.
The system MUST provide a UI in Telegram to manage (view/add/remove) these ignored fields.

#### Scenario: Ignore Custom Noisy Field
- **GIVEN** a user notices a custom noisy field "Story Points" in their Telegram notifications
- **WHEN** they interact with the Ignored Fields `/settings` and add "Story Points"
- **THEN** future notifications will automatically strip the "Story Points" field from output.

