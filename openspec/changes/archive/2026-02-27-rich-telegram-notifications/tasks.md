# Tasks: Rich Telegram Notifications

1. [x] **Update Notification Formatting:** Modify `TelegramNotifier` to stop truncating `Comment` and `Description` diffs. Add logic to handle Telegram's 4096-character message limit gracefully (e.g., splitting messages or adding a "Read more on Jira" link if it exceeds the limit).
2. [x] **Detect Attachments:** Update `JiraClient` and `MonitorService` to parse `Attachment` additions from the Jira `changelog`.
3. [x] **Download Attachments:** Add a new method in `JiraClient` (e.g., `downloadAttachment(url)`) that securely fetches the file buffer from Jira.
4. [x] **Upload to Telegram:** Update `Notifier` interface and `TelegramNotifier` to accept an array of attachments (buffers + filenames) and send them using `bot.sendDocument` or `bot.sendPhoto`.
5. [x] **Update Tests:** Write unit tests for the truncation removal, message splitting, and simulate attachment extraction in `monitor.test.ts`.
6. [x] **Test E2E:** Run the bot, add a long comment and an image attachment to a test Jira issue, and verify it all arrives intact in Telegram.
