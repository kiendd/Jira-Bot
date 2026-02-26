# User Management

## ADDED Requirements

### Requirement: User Registration
The system MUST allow users to register their Jira credentials linked to their Telegram Chat ID.
The system MUST support multiple distinct users, each with their own Jira configuration and issue tracking state.

#### Scenario: Register New User
- **GIVEN** a new Telegram user starts a chat
- **WHEN** they send the setup command with credentials
- **THEN** the bot encrypts the token using AES-256 AND saves the mapping of Chat ID to Encrypted Credentials AND starts monitoring for that user.

### Requirement: Security
The system MUST encrypt sensitive data (API Tokens) at rest in the database.
The system MUST decrypt the token only when establishing a connection to Jira.

#### Scenario: Verify Encryption
- **GIVEN** a registered user
- **WHEN** inspecting the database directly
- **THEN** the API Token field appears as an opaque ciphertext, not plain text.

### Requirement: Persistence
The system MUST persist user configurations across restarts.

#### Scenario: Restart Persistence
- **GIVEN** User A has registered
- **WHEN** the bot restarts
- **THEN** it automatically resumes monitoring for User A without requiring re-registration.

### Requirement: Command Interface
The bot MUST support commands to manage the session.
- `/start`: Welcome message.
- `/setup <host> <email> <token>`: Register credentials.
- `/status`: Check current monitoring status.
- `/stop`: Stop monitoring and remove credentials.

#### Scenario: Stop Monitoring
- **GIVEN** an active user
- **WHEN** they send `/stop`
- **THEN** the bot removes their credentials and stops polling for them.
