# notification Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: New Issue Formatting
The system MUST format notifications for newly detected issues differently than updated issues.
The system MUST include a prominent "New Task" indicator (e.g., ✨ emoji).
The system MUST attempt to show all directly populated custom and standard fields for a new task, extracting their human-readable values.

#### Scenario: Display Populated Fields on New Task
- **GIVEN** a brand new issue is created with a Description, Due Date, and custom string field
- **WHEN** the bot builds the notification
- **THEN** it iterates through all non-null fields and includes them as pseudo-diffs (e.g., "Description: ...", "Due Date: ...").

## ADDED Requirements
### Requirement: Filter Noisy Fields on New Tasks
The system MUST NOT include noisy internal Jira fields when summarizing a new task's populated fields.
The system MUST blocklist fields such as "Rank", "Work Ratio", "Sprint", "Epic Link", and "Component/s" to prevent long technical strings (e.g., `com.atlassian.greenhopper...`) from cluttering the Telegram UI.

#### Scenario: Ignore System Fields
- **GIVEN** a new issue is created that is assigned to an active Sprint and has a Work Ratio
- **WHEN** the bot builds the notification
- **THEN** it extracts the Description but DOES NOT include "Rank", "Sprint", or "Work Ratio" in the Telegram message details.
