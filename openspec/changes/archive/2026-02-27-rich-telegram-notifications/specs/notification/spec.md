# notification Specification Deltas

## MODIFIED Requirements
### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The Timestamp MUST be formatted in a human-readable layout according to the user's configured timezone, avoiding raw ISO date strings. Technical fields like "Stable since" should be omitted to prioritize readability. Any long text fields like "Comment" or "Description" MUST NOT be arbitrarily truncated to short lengths (e.g. 150 characters), but MUST be fully rendered. If a message exceeds Telegram's maximum character limit (4096 characters), the bot MUST handle it gracefully (e.g., by splitting the message or adding a truncation notice at the very end). The bot MUST also support rendering and delivering attachments downloaded from Jira directly into the chat (using `sendDocument` or `sendPhoto`).

#### Scenario: Full Comment Delivery
- **GIVEN** a Jira issue receives a highly detailed new comment (e.g. 500 characters)
- **WHEN** the bot formats the message
- **THEN** it includes the entire comment text without truncating it to 150 characters.

#### Scenario: Attachment Forwarding
- **GIVEN** a Jira issue has a new image attachment added
- **WHEN** the bot processes the notification
- **THEN** the bot uploads the image directly to the Telegram chat, attached to or alongside the field change notification.
