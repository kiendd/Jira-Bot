# Change Monitoring

## ADDED Requirements

### Requirement: Toggle Tracking Fields
The bot MUST allow users to disable tracking for specific fields (e.g., `status`, `assignee`). When a field is disabled, changes to that field MUST NOT trigger a notification and MUST NOT reset the debounce timer.

#### Scenario: Ignore Disabled Field
- **GIVEN** a user with `trackAssignee` set to false
- **WHEN** Issue A's assignee changes but its status does not
- **THEN** the bot ignores the assignee change and does NOT queue a notification for it.
