- [x] 1. Identify "New Task" Logic
   - In `MonitorService` (`src/services/monitor.ts`), identify when an issue has no previous DB state (`!previousState`).
   - If `!isFirstPoll` (meaning the bot is already running and established its baseline), treat this issue as a "New Task" instead of silently dropping it.

- [x] 2. Enqueue the "New Task" Notification
   - Add the issue to `pendingByUser` map with a distinct flag (`isNew: true`).
   - Allow the debounce cycle to process it immediately or queue it according to user preferences (quiet hours).

- [x] 3. Format the "New Task" Message
   - Update `Notifier.notify` method (`src/services/notifier.ts`) to check for the `isNew` flag.
   - If `isNew` is true, change the notification header to indicate "Mới được giao" (Newly assigned) or "Task Mới" (New Task) instead of "Thay đổi trong Jira" (Jira changed). 
   - Skip printing all the field diffs (since every field is technically "new"), and instead print the essentials: Project, Issue Key, Summary, Assignee, Reporter, Priority.

- [x] 4. Add Unit Tests for `MonitorService`
   - In `src/services/monitor.test.ts`, simulate a scenario where the `MonitorService` polls and finds an issue not in the `expectedState` map. Verify that the `notify` function is called with `isNew: true`.
