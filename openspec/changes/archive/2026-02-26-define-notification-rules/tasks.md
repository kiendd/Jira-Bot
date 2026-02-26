# Tasks for define-notification-rules

- [x] 1. Update `/settings` interactive menu to include toggles for standard Relationship-Based Scopes (Assigned, Created, Participated, Watched).
- [x] 2. Update user configuration schema to store selected relationship scopes and build the corresponding JQL dynamically.
- [x] 3. Implement Self-Action Filtering in the change-monitoring service: compare the author of the issue change/event against the user's configured Jira email/account and skip notification if they match.
- [x] 4. Add unit tests for the updated JQL builder logic.
- [x] 5. Add unit tests for the Self-Action Filtering logic in the change-monitoring service.
- [x] 6. Update `/status` command to display the newly selected relationship scopes instead of just raw JQL.
