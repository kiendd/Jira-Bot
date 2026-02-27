# Tasks: Interactive Quick Actions

1. [x] **Update Jira Client:** Add methods to `JiraClient` in `src/services/jira-client.ts` to support writing actions: `addComment(issueKey, body)`, `assignIssue(issueKey, accountId)`, `getTransitions(issueKey)`, and `transitionIssue(issueKey, transitionId)`.
2. [x] **Self-Lookup Method:** Add a method to `JiraClient` to get the current user's Account ID (since assigning in Jira Cloud often requires the `accountId` rather than the `email`).
3. [x] **Add Inline Keyboards:** Modify `TelegramNotifier` in `src/services/telegram.ts` so that when `notify()` emits a message containing an issue, it appends an inline keyboard with the three action buttons (`comment_ISSUEKEY`, `assign_ISSUEKEY`, `transition_ISSUEKEY`).
4. [x] **Handle Callbacks:** Implement callback query handlers in `TelegramNotifier` to listen for the `comment_`, `assign_`, and `transition_` prefixes.
5. [x] **Implement Assign Action:** Wire the `assign_` callback to fetch the user's Jira Client, get their `accountId`, assign the issue, and notify them of success/failure.
6. [x] **Implement Comment Action:** Wire the `comment_` callback to use Telegram's `ForceReply` mechanism. Listen for the reply message, extract the issue key from the context, and call `addComment`.
7. [x] **Implement Transition Action:** Wire the `transition_` callback to fetch transitions, update the inline keyboard with the transitions (`dotransition_ISSUEKEY_TRANSID`), and handle the secondary click to execute the transition.
8. [x] **Testing:** Add unit tests to `telegram.test.ts` and `jira-client.test.ts` to ensure the new methods and callback parsing work correctly.
