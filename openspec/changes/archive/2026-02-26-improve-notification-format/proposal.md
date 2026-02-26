# Improve Notification Format

## Context
Users have reported that the current Telegram notification format is visually unappealing and contains overly technical information. Specifically, the timestamp uses an unformatted ISO 8601 string (e.g., `2026-02-26T07:45:37.874Z`), and inclusion of the "Stable since" metadata is unnecessary for end-users. The overall layout can be streamlined to emphasize the most important information payload (Issue Key, Summary, and Changes).

## Why
This change is necessary to improve the user experience (UX) of the bot. A cleaner, localized, and more readable notification helps users quickly process Jira updates without cognitive overload from technical date formats or redundant labels.

## What Changes
1. **Localize Timestamps:** Update the notification builder to use the user's configured timezone (`preferences.schedule.timezone`) to format date strings into a readable format (e.g., `DD/MM/YYYY HH:mm`).
2. **Streamline Layout:** 
   - Combine the Issue Key and Summary into a bolder header, reducing visual clutter.
   - Remove the technical "Detected at" and "Stable since" labels.
   - Introduce a simpler, cleaner footer showing the update time.
3. **Payload Enhancement:** The `TelegramNotifier` currently lacks user context during the `notify` phase to apply the timezone. The `MonitorService` or `Notifier` interface will be slightly adjusted to pass `chatId` or timezone information so the formatting can be user-specific.
