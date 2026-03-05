# Task List: Group Notifications Attachments

- [x] 1. Add grouping logic to `TelegramNotifier` inside `src/services/telegram.ts` to use `sendMediaGroup` for grouping attachments when applicable.
- [x] 2. Update unit tests in `telegram.test.ts` to verify that `sendMediaGroup` is called when there are multiple attachments, instead of multiple `sendDocument` or `sendPhoto` calls.
- [x] 3. Validate and manually test the bot to ensure attachments are delivered correctly as albums.
