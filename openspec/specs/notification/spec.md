# notification Specification

## Purpose
TBD - created by archiving change implement-jira-monitor-bot. Update Purpose after archive.
## Requirements
### Requirement: Telegram Configuration
The bot MUST accept a Telegram Bot Token via environment variable `TELEGRAM_BOT_TOKEN`. User identifiers (Chat IDs) MUST be managed dynamically.

#### Scenario: Config Loading
- **GIVEN** `TELEGRAM_BOT_TOKEN` is set
- **WHEN** the bot starts
- **THEN** it initializes the Telegram client.

### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The Timestamp MUST be formatted in a human-readable layout according to the user's configured timezone, avoiding raw ISO date strings. Technical fields like "Stable since" should be omitted to prioritize readability.

#### Scenario: Formatted Notification Delivery
- **GIVEN** Issue A triggers a notification
- **WHEN** the bot formats the message
- **THEN** it generates a readable header (Issue Key + Summary), lists the changes, and appends a single timestamp formatted to the user's local timezone (e.g., `26/02/2026 14:45`).

### Requirement: Error Handling
The bot MUST log an error to the console if sending a Telegram message fails, but must not crash.

#### Scenario: Send Failure
- **GIVEN** an invalid Chat ID
- **WHEN** the bot attempts to send a message
- **THEN** it logs an error "Failed to send Telegram message" AND continues operation.

### Requirement: Quiet Hours Configuration
The bot MUST respect a user's defined "Quiet Hours" schedule based on their configured timezone.

#### Scenario: Suppress Notifications During Quiet Hours
- **GIVEN** a user has quiet hours configured from 18:00 to 08:00
- **WHEN** an issue stabilizes at 20:00 local time
- **THEN** the bot DOES NOT send the Telegram notification immediately, but keeps it queued until 08:00 the next day.

