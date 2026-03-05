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
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The bot MUST support rendering and delivering attachments downloaded from Jira directly into the chat. When multiple attachments are present, the bot SHOULD group compatible media (e.g. images) into a single Telegram album/media group message to reduce chat noise, rather than sending each file as an individual message.

#### Scenario: Multiple Image Attachments
- **GIVEN** a Jira notification with 3 image attachments
- **WHEN** the bot delivers the notification to Telegram
- **THEN** it sends the text notification first, followed by a single grouped media message (album) containing all 3 images.

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

### Requirement: Quick Action Handling
The bot MUST listen for callback queries from the interactive inline buttons. When a user clicks a quick action button, the bot MUST respond promptly (e.g. by answering the callback query to remove the loading state on the button) and trigger the corresponding flow. For workflows requiring user input (like adding a comment), the bot MUST prompt the user for input and maintain context of which issue they are replying to.

#### Scenario: Comment Button Clicked
- **GIVEN** an active Telegram notification with quick action buttons
- **WHEN** the user clicks `[💬 Comment]` for issue `TEST-123`
- **THEN** the bot sends a reply prompt asking the user to type their comment for `TEST-123`.

#### Scenario: Status Transition Menu
- **GIVEN** an active Telegram notification with quick action buttons
- **WHEN** the user clicks `[▶️ Transition Status]` for issue `TEST-123`
- **THEN** the bot fetches the available transitions from Jira and edits the message's inline keyboard to display the available target statuses.

