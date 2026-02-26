# change-monitoring Specification Deltas

## MODIFIED Requirements
### Requirement: Change Detection
The bot MUST detect if an issue has changed since the last poll by comparing the `updated` timestamp provided by Jira. It MUST identify and record the specific fields that changed across all standard and custom fields (including but not limited to Status, Assignee, Summary, Description, Priority, and Comments). The bot MUST NOT notify the user if the recent change was authored by the user themselves (Self-Action Filtering).

#### Scenario: Track Additional Fields
- **GIVEN** an issue is monitored by the bot
- **WHEN** the issue's priority is changed from "Medium" to "High", or a new comment is added by someone else
- **THEN** the bot detects the change, identifies the specific field(s) modified, and queues a notification including this diff.
