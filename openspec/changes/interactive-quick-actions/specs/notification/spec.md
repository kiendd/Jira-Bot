# notification Specification

## MODIFIED Requirements

### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The Timestamp MUST be formatted in a human-readable layout according to the user's configured timezone, avoiding raw ISO date strings. Technical fields like "Stable since" should be omitted to prioritize readability. Any long text fields like "Comment" or "Description" MUST NOT be arbitrarily truncated to short lengths (e.g. 150 characters), but MUST be fully rendered. If a message exceeds Telegram's maximum character limit (4096 characters), the bot MUST handle it gracefully (e.g., by splitting the message or adding a truncation notice at the very end). The bot MUST also support rendering and delivering attachments downloaded from Jira directly into the chat (using `sendDocument` or `sendPhoto`). The bot MAY attach an inline keyboard to the notification to afford Quick Actions.

#### Scenario: Include Quick Action Buttons
- **GIVEN** a Jira issue notification is generated
- **WHEN** the bot formats and sends the message
- **THEN** it includes an inline keyboard with buttons for `[💬 Comment]`, `[👤 Assign to Me]`, and `[▶️ Transition Status]`.

## ADDED Requirements

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
