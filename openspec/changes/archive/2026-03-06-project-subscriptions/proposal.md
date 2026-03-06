# Project Subscriptions via Interactive Settings

## Why
Currently, users scope their notifications by relationships (e.g., Assigned to Me, Created by Me, Participated). If a user wants to subscribe to all activities within specific Jira projects, they have to write a custom JQL query manually. Providing an interactive inline keyboard to browse and toggle project subscriptions will significantly improve the UX.

## What Changes
We will introduce `projectScopes`, an array of Project Keys stored in the `User` preferences.
We will enhance the `/settings` command's interactive menu to include a button that lists all available Jira projects fetched from the Jira API (`client.projects.getAllProjects()`).
Users can click a project in the inline keyboard to toggle their subscription.
The JQL builder will be updated: it will take the existing relationship conditions (e.g. `assignee = currentUser()`) and combine them with the selected projects (e.g. `project in ("PROJ1", "PROJ2")`) using an `OR` logic before applying the base date filtering (`AND updated > -1d`).

## Related Specs
- `user-management`: The interactive menu configuration logic.
