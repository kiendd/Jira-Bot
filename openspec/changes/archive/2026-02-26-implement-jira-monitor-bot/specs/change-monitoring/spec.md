# Change Monitoring

## ADDED Requirements

### Requirement: Periodic Polling
The bot MUST poll Jira at a fixed interval (User specified 5 minutes).

#### Scenario: periodic polling execution
- **GIVEN** the configured interval is 5 minutes
- **WHEN** the application runs
- **THEN** it triggers the polling function every 5 minutes.

### Requirement: Change Detection
The bot MUST detect if an issue has changed since the last poll by comparing the `updated` timestamp provided by Jira.

#### Scenario: Detect Update
- **GIVEN** an issue with updated timestamp T1
- **WHEN** the bot fetches the issue again with updated timestamp T2
- **THEN** it identifies a change if T2 > T1.

### Requirement: Debounce Stability Check
The bot MUST NOT notify immediately upon detecting a change. It MUST aggregate changes for an issue until a "quiet period" implies stability. The quiet period is defined as: No further changes detected in a subsequent poll cycle (or time > 5 mins since last change).

#### Scenario: One-time Change
- **GIVEN** Issue A changes at T=0
- **WHEN** Bot polls at T=0 (detects change)
- **THEN** Bot stores change in Pending list AND Bot DOES NOT notify.
- **WHEN** Bot polls at T=5 (detects NO change for A)
- **THEN** Bot checks time since last change (T=0) is >= 5 mins AND Bot Notifies user AND Bot clears Pending list for A.

#### Scenario: Continuous Changes
- **GIVEN** Issue B changes at T=0 AND Issue B changes again at T=4 (external to bot, but effectively detected at T=5)
- **WHEN** Bot polls at T=5 (detects change vs T=0 state)
- **THEN** Bot updates Pending list for B with new change time T=5 AND Bot DOES NOT notify.
- **WHEN** Bot polls at T=10 (detects NO change)
- **THEN** Bot checks time since last change (T=5) is >= 5 mins AND Bot Notifies user.
