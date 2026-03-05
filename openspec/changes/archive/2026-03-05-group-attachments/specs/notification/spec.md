## MODIFIED Requirements

### Requirement: Telegram Notification
The bot MUST send notifications to the configured Telegram Chat ID. The notification MUST include: Issue Key, Summary, Changed fields, and Timestamp. The bot MUST support rendering and delivering attachments downloaded from Jira directly into the chat. When multiple attachments are present, the bot SHOULD group compatible media (e.g. images) into a single Telegram album/media group message to reduce chat noise, rather than sending each file as an individual message.

#### Scenario: Multiple Image Attachments
- **GIVEN** a Jira notification with 3 image attachments
- **WHEN** the bot delivers the notification to Telegram
- **THEN** it sends the text notification first, followed by a single grouped media message (album) containing all 3 images.
