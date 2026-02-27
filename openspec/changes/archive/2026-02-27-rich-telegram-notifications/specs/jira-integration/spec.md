# jira-integration Specification Deltas

## MODIFIED Requirements
### Requirement: Fetching
The bot MUST be able to execute JQL queries to fetch issues. The bot SHOULD fetch fields: `updated`, `summary`, `status`, `assignee`. The bot MUST handle pagination if more than 50 issues are updated. The bot MUST also detect new attachments via the Jira `changelog` and MUST be able to download the raw file streams/buffers securely from Jira using the user's authentication token to be forwarded to notifications.

#### Scenario: Secure Attachment Download
- **GIVEN** an issue has a new attachment added
- **WHEN** the bot detects the attachment in the changelog
- **THEN** it uses its configured authentication tokens to download the file directly from Jira's servers.
