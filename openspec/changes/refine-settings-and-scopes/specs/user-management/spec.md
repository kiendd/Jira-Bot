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
The bot MUST support commands to manage the session, user preferences, and issue tracking scope.

#### Scenario: Scope Configuration Menu with Relationships
- **GIVEN** an active user
- **WHEN** they send `/settings`
- **THEN** the interactive menu includes quick-filter buttons for standard relationship scopes: "Assigned to Me", "Created by Me", "Participated", and "Watched".

#### Scenario: Human-Readable Scope
- **GIVEN** a user configures their scope to include "Participated" and "Watched" via the settings menu
- **WHEN** they run the `/status` command
- **THEN** the bot displays the human-readable Scope title combined, e.g., "🎯 Participated, 👁️ Watched" reflecting their chosen relationships.

## MODIFIED Requirements
### Requirement: Command Interface (Project Subscriptions & JQL Logic)
The bot MUST allow users to select specific Jira projects to monitor.
When both Relationship Scopes and Project Scopes are defined, the system MUST combine them using logical `AND`.

#### Scenario: Project Subscription Isolation
- **GIVEN** a user has configured "Assigned to Me" and selected project "PROJ1"
- **WHEN** the bot builds the JQL for monitoring
- **THEN** the JQL enforces an `AND` intersection: `(assignee = currentUser()) AND project in ("PROJ1") AND updated > -1d`.
- **AND** the user does not receive notifications for unassigned issues in "PROJ1".
