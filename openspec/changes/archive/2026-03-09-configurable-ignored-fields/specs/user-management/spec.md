# user-management Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: User Schema Storage
The system MUST store user configurations in a persistent database (MongoDB).
The system MUST include Chat ID (the primary key), Jira Host URL, Jira Email, Jira API Token (encrypted), User scope preferences, Active Status, and JQL.

### Requirement: Encryption
The system MUST encrypt the Jira API token before storing it.
The system MUST decrypt the Jira API token when interacting with the Jira API.

### Requirement: Telegram UI
The system MUST provide a Telegram interface to manage scopes and preferences.

#### Scenario: Update Notification Preferences
- **GIVEN** an active user is interacting with the `/settings` menu
- **WHEN** they toggle specific preference options
- **THEN** settings like `trackStatus` and `trackAssignee` are updated and applied to future polling cycles.

## ADDED Requirements
### Requirement: Configurable Ignored Fields
The system MUST allow users to configure a custom list of Jira fields they do NOT want to see in issue notifications.
The system MUST store these `ignoredFields` as an array of strings in the user's preferences.
The system MUST provide a UI in Telegram to manage (view/add/remove) these ignored fields.

#### Scenario: Ignore Custom Noisy Field
- **GIVEN** a user notices a custom noisy field "Story Points" in their Telegram notifications
- **WHEN** they interact with the Ignored Fields `/settings` and add "Story Points"
- **THEN** future notifications will automatically strip the "Story Points" field from output.
