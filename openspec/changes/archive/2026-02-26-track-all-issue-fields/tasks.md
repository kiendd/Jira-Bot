# Tasks: Track All Issue Fields

1. [x] **Investigate Jira API:** Verify the `changelog` payload structure when `expand=changelog` is used in the Jira search API.
2. [x] **Update JiraClient:** Modify `JiraClient.searchIssues` to request and parse the `changelog` field.
3. [x] **Update MonitorService Extraction:** Refactor `MonitorService` to generate `FieldDiff` objects by reading the Jira `changelog` rather than manually comparing a handful of fields against the database state.
4. [x] **Format Complex Diffs:** Update `TelegramNotifier` to truncate or format long text diffs (like description or comment additions) so they display cleanly in Telegram.
5. [x] **Update Tests:** Add test cases in `monitor.test.ts` to simulate changelog events for comments, descriptions, and other custom fields.
6. [x] **Test E2E:** Run the bot locally and verify it detects a comment addition and sends an appropriate alert.
