# Proposal: Configurable Ignored Fields

## The Problem
Currently, the Jira bot filters out several "noisy" fields (like `Sprint`, `Rank`, `Work Ratio`, etc.) from new issue notifications via a hardcoded set in `JiraClient`. However, the user wants the ability to dynamically configure this ignore list so they can easily add or remove specific Jira fields tracking without editing source code.

## Proposed Solution
1. **Database Schema Update:**
   Add a new field to `IUser.preferences` named `ignoredFields` (an array of strings). This array will default to the current hardcoded list of noisy fields so users don't have to manually block the common noisy fields themselves on first setup.

2. **JiraClient Filtering Update:**
   Modify `JiraClient.extractAllPopulatedFields` to remove fields that match the user's `ignoredFields` list instead of just checking an internal static blocklist. Since `JiraClient` is instantiated per active user in `MonitorService`, we will pass the `ignoredFields` array into the `JiraClient` constructor or directly to the extract function.

3. **Telegram UI Update:**
   - In `/settings -> Preferences`, add a new button: `🚫 Ignored Fields`.
   - When clicked, this prompts the user or opens an interactive flow to list current ignored fields, remove fields, or add a custom field name (e.g., "Custom Rank Component").

## Specs Affected
- `user-management`
- `notification`

## Task Breakdown
1. Update `user-management` and `notification` specs to include the new configurable ignored fields preference and its behavior in notifications.
2. Update `src/models/user.ts` to include `preferences.ignoredFields`, defaulting to `['rank', 'work ratio', 'sprint', 'epic link', 'components', 'component/s']`.
3. Update `JiraClient` signature in `src/services/jira-client.ts` to accept `ignoredFields: string[]` and use it alongside the internal technical blocklist (`customfield_10000`, `updated`, etc.).
4. Update `MonitorService` in `src/services/monitor.ts` to pass `user.preferences.ignoredFields` when extracting fields.
5. Create a new interaction flow in `TelegramNotifier` (`src/services/telegram.ts`) for adding/removing ignored fields.
6. Write/update unit tests for `User` model, `JiraClient`, and `TelegramNotifier`.
7. Request manual testing.
