# Change: Implement User Preferences

## Why
Currently, the Jira Monitor Bot sends notifications for any change to the `status` or `assignee` fields, at any time of day, as long as the debounce window passes. Users have different needs: some may only care about Status changes, while others may want to restrict notifications to their working hours to avoid being disturbed at night or on weekends. Providing granular configuration options improves the user experience and reduces alert fatigue.

## What Changes
- [NEW] Configurable Field Tracking: Users can toggle which fields they want to monitor (e.g., `trackStatus`, `trackAssignee`).
- [NEW] Quiet Hours / Working Hours: Users can define a timezone and a schedule (e.g., "Monday to Friday, 08:00 to 18:00") during which notifications are allowed. Changes detected outside these hours will either be queued or dropped depending on user preference.
- [NEW] Interactive Configuration UI: A new Telegram command `/settings` or an inline keyboard menu to allow users to easily toggle these preferences without typing complex commands.
- [NEW] Database Schema Updates: The `User` model in MongoDB will be expanded to store a `preferences` object containing these settings.

## Execution Strategy
1.  **Data Layer**: Update MongoDB `User` schema to include the `preferences` schema (tracking toggles, timezone, schedule).
2.  **Logic Layer**: Update `MonitorService` to respect these preferences before firing notifications (ignoring disabled fields, queuing/dropping during quiet hours).
3.  **Interface Layer**: Implement Telegram interactive menus (using Inline Keyboards) for the `/settings` command.

## Impact
- Affected specs: `user-management`, `change-monitoring`, `notification`.
- Backward compatibility: Existing users will be assigned default preferences (track all fields, send 24/7).
