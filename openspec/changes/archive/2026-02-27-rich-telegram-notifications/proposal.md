# Rich Telegram Notifications

## Context
Currently, the Jira monitor truncates long text fields (like comments and descriptions) to 150 characters to keep Telegram messages brief. It also completely ignores issue attachments. As a result, users frequently have to open the Jira web interface to read full comments or view attached images/documents.

## Why
Users want to rely on Telegram as their primary interface for consuming Jira updates without constantly context-switching. By providing full comments and uploading attachments directly to the chat, the bot becomes a much more powerful and self-sufficient notification hub.

## What Changes
1. **Full Text Rendering:** Remove the 150-character truncation limit for `Comment` and `Description` diffs in `TelegramNotifier`. Ensure the formatting respects Telegram's maximum message length (4096 characters) by splitting messages if a comment is exceptionally long.
2. **Attachment Detection:** Update `MonitorService` and/or `JiraClient` to detect when a new attachment is added to an issue (via the changelog).
3. **Attachment Download & Forwarding:** Implement logic in `JiraClient` to securely download the attachment buffer from Jira using the user's authentication token.
4. **Telegram Media Upload:** Update `TelegramNotifier` to accept file buffers and use Telegram's `sendPhoto` or `sendDocument` API to deliver the attachment directly into the chat alongside the notification text.
