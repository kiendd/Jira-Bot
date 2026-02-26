# Add Help Command

## Context
When users first start using the Jira bot, or when they forget available commands, they lack a dedicated command to show them how to interact with the bot. The only time they receive instructions is currently upon the initial `/start` if they are not yet registered.

## Proposed Solution
This proposal introduces a `/help` command that provides a clear, concise guide on how to register, configure tracking scopes, and check the bot's status. It will also update the `/start` command to explicitly mention the `/help` command.

1. **Add `/help` Command:** Responds with a tutorial/guide on using the bot.
2. **Update `/start` Command:** Modifies the welcome message to refer users to `/help` for detailed instructions.
