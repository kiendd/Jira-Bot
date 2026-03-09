# Proposal: Filter Irrelevant Jira Fields

## The Problem
When a new task is created, the bot extracts "all populated fields" to present a pseudo-diff in the Telegram message. However, Jira populates many internal or noisy fields by default that are not relevant to standard user notification (e.g., `Work Ratio`, `Rank`, `Sprint` object references, `Epic Link`, `Component/s`).
This makes the new task notifications unnecessarily long and difficult to read on mobile devices. 

## Proposed Solution
1. **Enhance the Blocklist:** 
   Modify the `extractAllPopulatedFields` logic in `src/services/jira-client.ts` to include common noisy fields in its `blocklist`. Based on user feedback, fields like `Rank`, `Work Ratio`, `Sprint`, `Epic Link`, and `Component/s` should be ignored.
   
2. **Handle Complex Objects Better:**
   Sometimes Sprint or other custom fields come through as complex arrays or objects (e.g., `com.atlassian.greenhopper.service.sprint.Sprint@...`). Ensure the parser correctly ignores these deep technical string representations.

3. **Ignore JQL Errors Gracefully:**
   The user logs show `[Monitor] Failed to fetch issues... getaddrinfo ENOTFOUND jira.fpt.com`. This is an environment/network error (VPN dropped or DNS fail). The bot correctly catches it without crashing, but we should make sure it doesn't repeatedly spam the terminal or user. (Current behavior is acceptable, just a note).

## Specs Affected
- `notification`

## Task Breakdown
1. Update `notification` spec with a scenario about filtering noisy task fields.
2. Edit `extractAllPopulatedFields` in `src/services/jira-client.ts` to add `Rank`, `Work Ratio`, `Sprint`, `Epic Link`, `Component`, `Components` to the `blocklist`.
3. Add a unit test to `monitor.test.ts` or `jira-client.test.ts` to pass a mock issue with these noisy fields and assert they are not returned in the `allPopulatedFields` array.
4. Run validation and verification.
