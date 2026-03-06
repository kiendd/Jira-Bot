# Task List: Project Subscriptions

1. Update `IUser` interface and Schema in `src/models/user.ts` to add `projectScopes: { type: [String], default: [] }` under `preferences`.
2. Update the JQL builder `buildJql` in `src/services/telegram.ts` to include `project in ("A", "B")` conditions, grouped with `OR` against existing relationship scopes.
3. Update `JiraClient` in `src/services/jira-client.ts` with a method `getAllProjects()` that calls `this.client.projects.getAllProjects()`.
4. Update `TelegramNotifier` settings menu in `src/services/telegram.ts` to include a `[📁 Select Projects]` button in the main menu.
5. Add callback query handling for `select_projects` to fetch and display the list of projects with toggle icons (✅/❌) and a navigation button back to settings.
6. Add callback query handling for toggling individual projects (`toggle_proj_KEY`) to update `projectScopes` and re-render the project list.
7. Update unit tests in `telegram.test.ts` to verify the new JQL building logic with projects.
8. Validate the new configuration flow manually via Telegram by toggling projects and monitoring `/status`.
