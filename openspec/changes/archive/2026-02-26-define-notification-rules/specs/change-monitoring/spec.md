# change-monitoring Specification

## MODIFIED Requirements
### Requirement: Change Detection
The bot MUST detect if an issue has changed since the last poll by comparing the `updated` timestamp provided by Jira. The bot MUST NOT notify the user if the recent change was authored by the user themselves (Self-Action Filtering).

#### Scenario: Ignore Self-Triggered Event
- **GIVEN** an issue is monitored by a user with email `user@example.com`
- **WHEN** the bot detects a change on the issue authored by `user@example.com`
- **THEN** the bot updates the known state of the issue to avoid future false positives AND DOES NOT queue a notification for this change.
