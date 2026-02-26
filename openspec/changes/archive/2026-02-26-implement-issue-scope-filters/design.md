# Design: Issue Scope Filters

## Architecture Updates

### 1. Telegram Inline Keyboard Expansion
The `/settings` menu currently handles generic preferences. We will add a new row of buttons dedicated to "Scope":
- [ 👤 My Issues ] -> `callback_data: 'scope_mine'`
- [ 👁️ Watched ] -> `callback_data: 'scope_watched'`
- [ 🌐 All Updates ] -> `callback_data: 'scope_all'`

### 2. JQL Constants
To ensure consistency and ease of maintenance, we will define the predefined JQL strings as constants within `telegram.ts` (or a dedicated configuration file):
```typescript
const JQL_SCOPES = {
    MINE: 'assignee = currentUser() OR reporter = currentUser() AND updated > -1d',
    WATCHED: 'watcher = currentUser() AND updated > -1d',
    ALL: 'updated > -1d'
};
```

### 3. Callback Query Implementation
When a user clicks a scope button, the `callback_query` handler will interpret the action:
1. Lookup the corresponding constant from `JQL_SCOPES`.
2. Update `user.jql` with the string.
3. Save the document.
4. Refresh the settings menu UI to show the active scope.

### 4. Human-Readable Display
In `/status` and `/settings`, we will reverse-map the `user.jql` string back to a human-readable title:
- If `user.jql === JQL_SCOPES.MINE`, display "👤 My Issues"
- If `user.jql === JQL_SCOPES.WATCHED`, display "👁️ Watched"
- If `user.jql === JQL_SCOPES.ALL`, display "🌐 All Updates"
- Else, display "⚙️ Custom JQL"
