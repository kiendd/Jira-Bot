# Tasks

## Phase 1: Logic Layer Updates
- [x] Define `JQL_SCOPES` constants in `telegram.ts` (MINE, WATCHED, ALL). <!-- id: p1-jql-constants -->
- [x] Create a helper function `getScopeLabel(jql: string): string` to map a raw JQL string to its human-readable title. <!-- id: p1-scope-label-helper -->

## Phase 2: Interface Layer Updates
- [x] Update `buildSettingsMenu` to include inline keyboard buttons for the predefined scopes. <!-- id: p2-settings-buttons -->
- [x] Update the `callback_query` handler to process `scope_mine`, `scope_watched`, and `scope_all` actions by saving the corresponding JQL to the database. <!-- id: p2-callback-handler -->
- [x] Update the `/status` command and the `/settings` UI text to display the current Scope using the `getScopeLabel` helper. <!-- id: p2-status-ui-update -->

## Phase 3: Verification
- [x] Verify clicking "My Issues" updates the database JQL correctly and the UI displays the new Scope label. <!-- id: p3-verify-menu-click -->
- [x] Verify `/status` displays the custom label "⚙️ Custom JQL" if a custom JQL is set via `/jql <query>`. <!-- id: p3-verify-custom-label -->
