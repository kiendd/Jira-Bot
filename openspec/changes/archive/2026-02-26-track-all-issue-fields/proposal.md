# Track All Issue Fields

## Context
Currently, the Jira monitor only tracks and notifies users about changes to the `Status` and `Assignee` fields. If an issue's summary, description, priority, or if a new comment is added, the user receives no notification even if the issue's `updated` timestamp changes.

## Why
Users need comprehensive visibility into issue updates to stay fully informed. Important context is often added via comments, description updates, or priority changes, which are currently being ignored by the bot's diff engine.

## What Changes
1. **Comprehensive Field Tracking:** Update the `MonitorService` and/or `JiraClient` to detect and record changes across all relevant issue fields (e.g., Summary, Description, Priority, Labels, Comments).
2. **Changelog Utilization:** Instead of deep-comparing stored states, leverage Jira's `changelog` API (via `expand=changelog`) to reliably determine exactly what changed since the last known state.
3. **Dynamic Notification Formatting:** Update `TelegramNotifier` to handle complex diffs smoothly, ensuring large text fields (like descriptions) or new comments don't exceed Telegram message length limits or break formatting.
