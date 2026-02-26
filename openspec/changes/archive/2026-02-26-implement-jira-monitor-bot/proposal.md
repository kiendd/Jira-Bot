# Change: Implement Jira Monitor Bot

## Why
The user needs a way to monitor Jira issues for changes and be notified. To avoid spam, notifications must be aggressively debounced (wait for 5 minutes of stability). This reduces noise from frequent updates.

## What Changes
- [NEW] Jira Integration Service:
  - Connects to Jira Cloud via Email/Token.
  - Supports JQL search.
- [NEW] Polling & Change Detection:
  - Runs every 5 minutes (configurable).
  - Compares issue `updated` fields against stored state.
- [NEW] Debounce/Cooldown Mechanism:
  - Groups updates.
  - Waits for stability (5 mins silence) before notifying.
- [NEW] Telegram Notification System:
  - Sends alerts to specific Chat IDs.
  - Formats messages clearly using HTML/MarkdownV2, highlighting specific field changes (e.g., Status: To Do ➡️ In Progress).
- [NEW] Multi-user Management & Interactive Commands:
  - Users register via Telegram commands (`/setup`).
  - Command `/jql <query>` to define personal Jira filters.
  - Commands `/start`, `/stop` (pause/resume), and `/status` (view current config/status).
  - Data persisted in MongoDB.
- [NEW] Resilience & Error Handling:
  - Notifies user via Telegram if their Jira token expires or authentication fails.
  - Handles API rate limits (HTTP 429) gracefully with backoff.
- [NEW] Token Encryption:
  - API tokens encrypted with AES-256 before storage.

## Execution Strategy
Using a **Phased Implementation** approach:
1.  **Foundation**: Core polling, debounce logic, smart diff detection (Console output).
2.  **Integration**: Connect Telegram Bot & Message Formatting.
3.  **Scaling**: Add MongoDB, Multi-user support, and Interactive Commands (`/start`, `/stop`, `/status`, `/jql`).
4.  **Security & Resilience**: Apply encryption to sensitive data, add Error/Auth failure notifications.
5.  **Future Enhancements**: Configurable Working hours/Quiet time, transition from Polling to Jira Webhooks for real-time updates.

## Impact
- Affected specs: `jira-integration`, `change-monitoring`, `notification`, `user-management`
- Affected code: New Node.js project structure (`src/`), `package.json`.
- New Dependencies: `node-telegram-bot-api`, `mongoose` (for MongoDB), `crypto` (built-in)
