# Notification

## ADDED Requirements

### Requirement: Telegram Configuration
The bot MUST accept a Telegram Bot Token via environment variable `TELEGRAM_BOT_TOKEN`. User identifiers (Chat IDs) MUST be managed dynamically.

#### Scenario: Config Loading
- **GIVEN** `TELEGRAM_BOT_TOKEN` is set
- **WHEN** the bot starts
- **THEN** it initializes the Telegram client.

### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp.

#### Scenario: Notification Trigger
- **GIVEN** Issue A was unstable and is now stable (no changes in last cycle)
- **WHEN** the bot runs the notification phase
- **THEN** it sends a message to the Telegram Chat: "Issue PROJ-123 has stabilized. Changes detected."

### Requirement: Error Handling
The bot MUST log an error to the console if sending a Telegram message fails, but must not crash.

#### Scenario: Send Failure
- **GIVEN** an invalid Chat ID
- **WHEN** the bot attempts to send a message
- **THEN** it logs an error "Failed to send Telegram message" AND continues operation.
