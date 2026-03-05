# Group Notifications Attachments

## Why
Currently, the Jira bot sends attachments as separate, individual Telegram messages. This can be very noisy and clog up the chat history when a Jira issue contains multiple attachments (e.g. 5 screenshots attached at once). The user wants these attachments grouped together to reduce chat clutter.

## What Changes
We will modify the `TelegramNotifier` class to group multiple attachments into a single "Media Group" or "Album" message using the Telegram Bot API's `sendMediaGroup` method.

### How it will work
If there are multiple attachments, the bot will filter out eligible media types (photos/videos) that can be grouped and send them as a single media group. If an attachment cannot be grouped (e.g., a PDF document or a binary file depending on Telegram's strict grouping rules), or if there is only one attachment, it may fall back to sending them individually or as a single message.
Note: Telegram's `sendMediaGroup` primarily handles photos and videos. Documents can also be grouped, but the visual rendering may vary.

## Related Specs
- `notification`: The underlying notification formatting and delivery logic.
