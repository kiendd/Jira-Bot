# Proposal: Notify on New Issues

## Context
Currently, the Jira bot establishes a baseline when it first sees an issue, and only notifies the user when a known issue changes. This means that if a brand new issue is created and assigned to the user (or simply enters the user's JQL results), the user receives no notification about the existence of this new issue. This leads to missed tasks if the user is not actively checking Jira.

## Proposed Change
We propose extending the bot's Change Detection mechanism to notify the user when a *new* issue is detected for the first time. The bot will differentiate between "baseline initialization" and "genuine new issues". When an issue appears in the user's JQL results and has no previous state in the DB, the bot will notify the user with a special "New Task" message. To avoid spam on the very first run of the bot for a new user, a threshold (like issue creation date or only tracking issues discovered *after* the initial user baseline) can be used.

## Affected Specs
- `change-monitoring`: Add a requirement for detecting and notifying about new issues vs just existing issue changes.
