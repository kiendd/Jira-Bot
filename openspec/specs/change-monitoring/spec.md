# change-monitoring Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: Periodic Polling
The bot MUST poll Jira at a fixed interval (User specified 5 minutes).

#### Scenario: periodic polling execution
- **GIVEN** the configured interval is 5 minutes
- **WHEN** the application runs
- **THEN** it triggers the polling function every 5 minutes.

### Requirement: Change Detection
The bot MUST detect if an issue has changed since the last poll by comparing the `updated` timestamp provided by Jira. It MUST identify and record the specific fields that changed across all standard and custom fields (including but not limited to Status, Assignee, Summary, Description, Priority, and Comments). The bot MUST NOT notify the user if the recent change was authored by the user themselves (Self-Action Filtering).

#### Scenario: Track Additional Fields
- **GIVEN** an issue is monitored by the bot
- **WHEN** the issue's priority is changed from "Medium" to "High", or a new comment is added by someone else
- **THEN** the bot detects the change, identifies the specific field(s) modified, and queues a notification including this diff.

### Requirement: Debounce Stability Check
The bot MUST NOT notify immediately upon detecting a change. It MUST aggregate changes for an issue until a "quiet period" implies stability. The quiet period is defined as: No further changes detected in a subsequent poll cycle (or time > 5 mins since last change).

#### Scenario: One-time Change
- **GIVEN** Issue A changes at T=0
- **WHEN** Bot polls at T=0 (detects change)
- **THEN** Bot stores change in Pending list AND Bot DOES NOT notify.
- **WHEN** Bot polls at T=5 (detects NO change for A)
- **THEN** Bot checks time since last change (T=0) is >= 5 mins AND Bot Notifies user AND Bot clears Pending list for A.

#### Scenario: Continuous Changes
- **GIVEN** Issue B changes at T=0 AND Issue B changes again at T=4 (external to bot, but effectively detected at T=5)
- **WHEN** Bot polls at T=5 (detects change vs T=0 state)
- **THEN** Bot updates Pending list for B with new change time T=5 AND Bot DOES NOT notify.
- **WHEN** Bot polls at T=10 (detects NO change)
- **THEN** Bot checks time since last change (T=5) is >= 5 mins AND Bot Notifies user.

### Requirement: Toggle Tracking Fields
The bot MUST allow users to disable tracking for specific fields (e.g., `status`, `assignee`). When a field is disabled, changes to that field MUST NOT trigger a notification and MUST NOT reset the debounce timer.

#### Scenario: Ignore Disabled Field
- **GIVEN** a user with `trackAssignee` set to false
- **WHEN** Issue A's assignee changes but its status does not
- **THEN** the bot ignores the assignee change and does NOT queue a notification for it.

### Requirement: New Issue Detection
The bot MUST detect when an issue first enters the user's JQL results and notify the user. When an issue has no previous state in the database, the bot MUST evaluate if the issue is a genuine new task (e.g., recently created or recently assigned) and send a notification indicating a "New Task", rather than suppressing it as a silent baseline. 

#### Scenario: Newly Assigned Task
- **GIVEN** a new issue is created or assigned to the user
- **WHEN** the bot polls and finds the issue has no previous state in the database, but realizes the user is not in the first-poll baseline phase
- **THEN** the bot records the baseline state AND triggers a "New Task" notification for the issue.

