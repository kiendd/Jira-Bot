# Define Notification Rules

## Context
Users currently receive notifications for any changes to issues within their configured JQL scope. However, they lack fine-grained control over what constitutes a "related issue" and often receive redundant notifications for actions they performed themselves (e.g., updating a field or commenting on an issue). 

## Proposed Solution
This proposal introduces two key capabilities to give users clear control over their notification rules:

1. **Self-Action Filtering:** Automatically suppression of notifications if the change was authored by the user receiving the notification. If a user modifies an issue or adds a comment, they should not be notified about their own action.
2. **Relationship-Based Scopes:** Enhance the configuration menu (`/settings`) to explicitly offer predefined, human-readable issue relationships. Users can toggle these on or off to combine their monitoring scope. Examples include:
   - "Issues I Created" (`reporter = currentUser()`)
   - "Issues Assigned to Me" (`assignee = currentUser()`)
   - "Issues I Participated In" (Commented/Modified) (`issue in commentedIssues()` or `issue in updatedBy(currentUser())`)
   - "Watched Issues" (`issue in watchedIssues()`)

These changes provide clarity on exactly what issues are monitored and reduce notification spam for self-triggered events.
