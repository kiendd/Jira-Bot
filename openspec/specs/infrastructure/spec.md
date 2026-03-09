# infrastructure Specification

## Purpose
TBD - created by archiving change api-caching. Update Purpose after archive.
## Requirements
### Requirement: API Caching
The system MUST implement an in-memory caching mechanism to reduce redundant requests to external APIs (Jira).
The system MUST isolate cached API responses per user contexts to prevent unauthorized data leakage. Cache keys MUST include identifying factors such as Jira Host and User Email/Token.

#### Scenario: Caching Static Metadata
- **GIVEN** a user navigates to the project selection menu in Telegram
- **WHEN** `getAllProjects` is invoked multiple times within 5 minutes
- **THEN** the system fetches the project list from the Jira API exactly once and returns the cached result for subsequent calls.

#### Scenario: Coalescing Search Queries
- **GIVEN** the monitoring service polls for issues with a specific JQL
- **WHEN** an identical JQL poll is requested within 15 seconds for the same user context
- **THEN** the system returns the cached search results rather than initiating a new network request to Jira.

