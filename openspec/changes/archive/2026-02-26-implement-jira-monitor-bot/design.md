# Design: Jira Monitor Bot

## Architecture

### Components
1.  **Database**: MongoDB (via Mongoose) to store Users and IssueState.
2.  **UserManager**: Manages user persistence. Mongoose Model `User` stores `chatId`, encrypted `apiToken`, `email`, `jql` (custom filter), and `isActive` (bot status).
3.  **EncryptionService**: Encrypts/Decrypts API tokens using AES-256-GCM.
4.  **JiraClientFactory**: Creates `JiraClient` instances per user (decrypts token first).
5.  **MonitorService**: Orchestrates the polling loop for ALL active users.
6.  **StateStore**: Persists state per user (Mongoose Model: `IssueState`).
7.  **TelegramNotifier**: routes messages to specific Chat IDs.

## Debounce/Cooldown Logic (The Core Requirement)

The logic is scoped **per user**.

**Algorithm:**
Time `T`: Poll Cycle (e.g., every 5 mins).

**On Poll(T):**
1.  **Retrieve all active users** from `User` collection.
2.  **For each active User U (`isActive == true`)**:
    a.  **Connect**: Decrypt token, create `JiraClient`. *If Auth fails, set `U.isActive = false` and send Telegram alert to re-authenticate.*
    b.  **Fetch**: Get updated issues for `U` from Jira using `U.jql` (or default JQL if not set).
    c.  **Compare**: Check against `IssueState` collection for `U`. Generate a *smart diff* of what fields changed (e.g., Status, Assignee, Comments).
    d.  **Track**:
        - If new change detected: Update `PendingNotifications` (mark `last_change_time = T`).
        - If NO change detected: Check if `PendingNotifications` has been "quiet" for >= 5 mins.
    e.  **Notify**:
        - If "quiet" condition met -> Send formatted Telegram Message (HTML/MarkdownV2) with the *smart diff* to `U.chatId`.
        - Clear from `PendingNotifications`.

**Example Trace:**
- **00:00**: Issue A changes. Bot sees change. Stores `Pending[A] = {last: 00:00}`. Age=0. **Wait**.
- **00:05**: Issue A changes again. Bot sees change. Updates `Pending[A] = {last: 00:05}`. Age=0. **Wait**.
- **00:10**: Issue A NO change key. Bot sees `Pending[A].last` is 00:05. Current T=00:10. Age=5 min. **Notify**.

This satisfies the requirement: "changes detected... wait... if *next cycle* no change, then notify".

## Configuration
- `TELEGRAM_BOT_TOKEN`: Global bot token.
- `MONGODB_URI`: Connection string for MongoDB.
- `ENCRYPTION_KEY`: 32-byte key for AES-256.
- `POLL_INTERVAL_MS`: Global poll interval.
- `DEBOUNCE_WINDOW_MS`: Global debounce window.

## Data Security
- **API Tokens**: Must be encrypted at rest in MongoDB.
- **Algorithm**: AES-256-GCM.
- **Key Management**: `ENCRYPTION_KEY` env var (never committed).

