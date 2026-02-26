# notification Specification

## MODIFIED Requirements
### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The Timestamp MUST be formatted in a human-readable layout according to the user's configured timezone, avoiding raw ISO date strings. Technical fields like "Stable since" should be omitted to prioritize readability.

#### Scenario: Formatted Notification Delivery
- **GIVEN** Issue A triggers a notification
- **WHEN** the bot formats the message
- **THEN** it generates a readable header (Issue Key + Summary), lists the changes, and appends a single timestamp formatted to the user's local timezone (e.g., `26/02/2026 14:45`).
