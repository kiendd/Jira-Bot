# Explicit New Issue Notification

## Context
Currently, when the Jira monitor fetches a completely new issue matching the user's criteria, it fakes an update diff (e.g., "Status: None -> To Do") to ensure the system doesn't discard it. While this ensures delivery, the resulting Telegram notification looks exactly like a standard issue update, causing confusion about whether an issue was just modified or newly created.

## Why
Users need immediate, clear context when a new task is assigned to them or created. Distinguishing "New Issue Created" from "Issue Updated" prevents cognitive overload and aligns the bot's behavior with standard notification systems.

## What Changes
1. **Payload Flag:** Introduce an `isNew` boolean property to the `NotificationPayload` interface.
2. **Detection Logic:** Update `MonitorService` to set `isNew = true` when an issue is discovered for the first time without prior state, instead of generating synthetic "None -> Value" diffs.
3. **Distinct Formatting:** Update `TelegramNotifier.formatMessage` to render a specific layout when `isNew` is true. For example:
   `✨ <b>New Issue: <a href="...">PROJ-123</a></b>`
   `<b>Summary:</b> ...`
   `<b>Status:</b> To Do | <b>Assignee:</b> User`
   This omits the redundant "Changes:" list entirely.
