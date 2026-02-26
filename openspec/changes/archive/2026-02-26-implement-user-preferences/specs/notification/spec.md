# Notification

## ADDED Requirements

### Requirement: Quiet Hours Configuration
The bot MUST respect a user's defined "Quiet Hours" schedule based on their configured timezone.

#### Scenario: Suppress Notifications During Quiet Hours
- **GIVEN** a user has quiet hours configured from 18:00 to 08:00
- **WHEN** an issue stabilizes at 20:00 local time
- **THEN** the bot DOES NOT send the Telegram notification immediately, but keeps it queued until 08:00 the next day.
