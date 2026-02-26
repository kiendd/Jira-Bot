# Change: Implement Issue Scope Filters

## Why
Currently, the Jira Monitor Bot defaults to tracking *all* issues updated in the last day (`updated > -1d`). While users can manually set a custom scope using `/jql <query>`, writing Jira Query Language (JQL) is difficult and error-prone for non-technical users. Without a clear filter, users on large Jira instances might receive notifications for issues completely unrelated to them (e.g., tickets handled by other teams).

We need to provide easy, one-click options in the Telegram `/settings` menu to define the scope of what is considered "related" to the user, balancing simplicity with the power of JQL.

## What Changes
- [NEW] Predefined Scope Filters: Add standard tracking scopes to the `/settings` interactive menu:
  - **My Issues**: Only track issues assigned to or reported by the user (`assignee = currentUser() OR reporter = currentUser() AND updated > -1d`).
  - **Watched Issues**: Only track issues the user is actively watching in Jira (`watcher = currentUser() AND updated > -1d`).
  - **All Updates**: The current default behavior (`updated > -1d`).
- [NEW] JQL Mapping logic: When a user selects a quick filter button, the bot will automatically overwrite their `jql` field in the database with the corresponding validated JQL string.
- [NEW] Visual Indicator: Update the `/settings` and `/status` messages to display a human-readable "Scope Focus" (e.g., Scope: 👤 My Issues) instead of just dumping raw JQL strings.

## Execution Strategy
1. **Interface Layer**: Expand the `TelegramNotifier`'s `/settings` inline keyboard to include buttons for the predefined scopes (e.g., `set_scope_my_issues`, `set_scope_watched`).
2. **Logic Layer**: Add handler logic in the `callback_query` listener to map these button clicks to the correct standard JQL strings and save them to the `User` model. Update the `/status` standard formatter to map known JQL strings back to human-readable labels.

## Impact
- Affected specs: `user-management`.
- Backward compatibility: Existing JQL queries will remain untouched unless the user explicitly clicks one of the new scope buttons. Custom JQLs will display as "Scope: ⚙️ Custom JQL" in the status readout.
