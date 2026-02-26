# notification Specification

## MODIFIED Requirements
### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The Timestamp MUST be formatted in a human-readable layout according to the user's configured timezone, avoiding raw ISO date strings. 

The bot MUST distinguish between newly created issues and updated issues. If an issue is newly created (or newly matched without prior history), the notification MUST explicitly state it is a "New Issue" and omit the list of changed fields.

#### Scenario: New Issue Delivery
- **GIVEN** Issue B is newly created and matches the user's scope
- **WHEN** the bot formats the message
- **THEN** it generates a distinct header (e.g., "New Issue: PROJ-123"), displays the current Status and Assignee, and omits the "Changes" list.
