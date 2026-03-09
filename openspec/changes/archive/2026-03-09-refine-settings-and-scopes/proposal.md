# Proposal: Refine Settings Menu & Project Scopes Logic

## The Problem
As more feature toggles and filters have been added to the Jira Monitor Bot, the main `/settings` menu has become cluttered and visually overwhelming. Additionally, the recent introduction of Project Subscriptions combined project filters with relationship scopes using an `OR` logic in JQL. This resulted in unintended behavior: if a user subscribes to a project, they receive notifications for *all* activity in that project, bypassing their explicit relationship filters (e.g., "Assigned to Me").

## Proposed Solution

1. **Menu Reorganization (Sub-menus)**
   - Refactor the `TelegramNotifier.buildSettingsMenu` into a structured, drill-down menu system.
   - **Main Menu UI**: Provide high-level categories rather than all toggles at once.
     - `[👥 Relationship Scopes]` -> Navigates to Assigned, Created, Participated, Watched.
     - `[📁 Project Subscriptions]` -> Existing project multi-select menu.
     - `[⚙️ Preferences]` -> Track Status, Track Assignee, set timezone.
   - Use standard callback queries to handle navigation between these states, maintaining the "Back" button pattern introduced by the projects menu.

2. **JQL Logic Fix (AND instead of OR)**
   - Modify `buildJql` in `src/services/telegram.ts`.
   - When both relationship scopes and project scopes are present, they must be combined with an `AND` operator, not `OR`.
   - **Example**: `((assignee = currentUser()) AND (project in ("PROJ1", "PROJ2"))) AND updated > -1d`.
   - This ensures users only receive updates for issues they care about, *within* the projects they care about.

## Specs Affected
- `user-management`

## Technical Details
- **Settings State:** The Telegram bot interaction doesn't necessarily need a complex state machine; it can just render different `editMessageText` views based on specific callback prefixes (e.g., `menu_main`, `menu_relationships`, `menu_preferences`).
- **JQL Builder Updating:** The `combinedQueryParts.join(' OR ')` must be changed to `combinedQueryParts.join(' AND ')`. Unit tests in `telegram.test.ts` will need to be updated to match the new strict `AND` requirements.
