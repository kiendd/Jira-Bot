# user-management Specification

## MODIFIED Requirements
### Requirement: Command Interface
The bot MUST support commands to manage the session, user preferences, and issue tracking scope.

#### Scenario: Scope Configuration Menu with Relationships
- **GIVEN** an active user
- **WHEN** they send `/settings`
- **THEN** the interactive menu includes quick-filter buttons for standard relationship scopes: "Assigned to Me", "Created by Me", "Participated", and "Watched".

#### Scenario: Human-Readable Scope
- **GIVEN** a user configures their scope to include "Participated" and "Watched" via the settings menu
- **WHEN** they run the `/status` command
- **THEN** the bot displays the human-readable Scope title combined, e.g., "🎯 Participated, 👁️ Watched" reflecting their chosen relationships.
