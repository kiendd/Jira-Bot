# Interactive Quick Actions

## Context
Currently, the Jira monitor bot strictly acts as a one-way notification system. While users receive rich updates with full comments and attachments, they still must leave Telegram and open Jira to take action (e.g., replying to a comment, picking up an issue, or moving it to Done).

## Why
Allowing users to perform simple, high-frequency actions directly from Telegram significantly reduces context switching and friction. If a user can assign an issue to themselves or leave a quick reply without opening a browser, the bot becomes a much more powerful productivity tool.

## What Changes
1. **Interactive Notifications**: Notification messages for Jira issues will now include inline keyboard buttons for quick actions such as `[💬 Comment]`, `[👤 Assign to Me]`, and `[▶️ Transition Status]`.
2. **Comment Flow**: Clicking the `Comment` button prompts the user (using Telegram's `ForceReply` or by listening to the next message) to type their comment, which the bot then posts to Jira on their behalf.
3. **Assign to Me**: Clicking the `Assign to Me` button instantly makes an API call to Jira to assign the issue to the user configured for that Telegram chat.
4. **Status Transitions**: Clicking the `Transition Status` button queries Jira for available transitions for that specific issue and presents them as another inline keyboard for the user to select.
