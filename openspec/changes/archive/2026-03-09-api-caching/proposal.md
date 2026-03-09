# Proposal: API Request Caching

## The Problem
Currently, the Jira bot does **not** have a caching mechanism for Jira API requests. This leads to a substantial amount of redundant network queries: 
- `MonitorService` polls Jira (`searchIssues`) every 60 seconds per user, fetching potentially large JQL payloads repeatedly. 
- Telegram interactions like navigating to `/settings` or resolving an issue hit endpoints like `getAllProjects()` or `getTransitions()` on every click, creating unnecessary load and slowing down the UI.

## Proposed Solution
Introduce an in-memory caching mechanism using `node-cache` (or a simple Map) inside `JiraClient` to store and reuse responses for a specific Time-To-Live (TTL). 

**Cache Design:**
- **Static Metadata (Projects, Transitions):** Cache for 5 minutes. These rarely change and are frequently queried when users interact with Telegram menus.
- **Search Queries (JQL):** Cache for 15 seconds. This short TTL coalesces concurrent overlapping poll requests if multiple identical configurations exist, without returning stale data on the next minute's poll interval.
- **Cache Key Generation:** Hash or combine `host + userEmail + endpoint_or_jql` to ensure users don't cross-pollute secure data, since each user might have different Jira permissions.

## Specs Affected
- `infrastructure` (New spec defining bot performance & resilience expectations)

## Task Breakdown
1. Install a lightweight caching library like `node-cache` via npm (or implement a lightweight `Map` wrapper with timestamps).
2. Create `infrastructure` spec to formally document cache standards and TTLs.
3. Update `JiraClient` constructor to initialize a static or singleton Cache instance.
4. Integrate cache wrapper around `getAllProjects()` (5m TTL).
5. Integrate cache wrapper around `getTransitions()` (5m TTL).
6. Integrate cache wrapper around `searchIssues()` (15s TTL).
7. Validate spec and test application for performance improvements.
