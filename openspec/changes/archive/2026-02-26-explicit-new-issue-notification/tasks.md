# Tasks for explicit-new-issue-notification

- [x] 1. Add `isNew?: boolean` to the `NotificationPayload` interface in `src/services/notifier.ts`.
- [x] 2. Add an `isNew` boolean to the `PendingChange` interface in `src/services/monitor.ts`.
- [x] 3. Update `MonitorService.pollUser` to set `isNew = true` (and avoid creating synthetic 'None' diffs) when a brand new issue is discovered.
- [x] 4. Update `MonitorService.checkStability` to pass `isNew` to the final `NotificationPayload` and bypass empty-diff filtering if `isNew` is true.
- [x] 5. Refactor `TelegramNotifier.formatMessage` to check `payload.isNew` and render a distinct "New Issue" template (e.g., using a ✨ icon and omitting the change list).
- [x] 6. Update unit tests in `telegram.test.ts` to verify the new message format branch.
