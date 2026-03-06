import TelegramBot from 'node-telegram-bot-api';
import { Notifier, NotificationPayload } from './notifier';
import { User, IUser } from '../models/user';
import { encrypt, decrypt } from './encryption';
import { JiraClient } from './jira-client';

export function buildJql(scopes: any, projectScopes: string[] = [], email?: string): string {
    const parts: string[] = [];
    if (scopes.assigned) parts.push('assignee = currentUser()');
    if (scopes.created) parts.push('reporter = currentUser()');
    if (scopes.participated) {
        if (email) {
            parts.push(`issue in updatedBy("${email}")`);
        } else {
            parts.push('issue in updatedBy(currentUser())');
        }
    }
    if (scopes.watched) parts.push('issue in watchedIssues()');

    let baseQuery = '';
    if (parts.length > 0) {
        baseQuery = `(${parts.join(' OR ')})`;
    }

    let projectQuery = '';
    if (projectScopes && projectScopes.length > 0) {
        const quotedProjects = projectScopes.map(p => `"${p}"`);
        projectQuery = projectScopes.length > 1 ? `(project in (${quotedProjects.join(', ')}))` : `project in (${quotedProjects.join(', ')})`;
    }

    const combinedQueryParts: string[] = [];
    if (baseQuery) combinedQueryParts.push(baseQuery);
    if (projectQuery) combinedQueryParts.push(projectQuery);

    if (combinedQueryParts.length === 0) {
        return 'updated > -1d';
    }

    const combinedString = combinedQueryParts.length > 1 ? `(${combinedQueryParts.join(' OR ')})` : combinedQueryParts[0];

    return `${combinedString} AND updated > -1d`;
}

export function getScopeLabel(user: IUser): string {
    const scopes = user.preferences?.relationshipScopes;
    const projectScopes = user.preferences?.projectScopes || [];
    if (!scopes) return '⚙️ Custom JQL';

    const expectedJql = buildJql(scopes, projectScopes, user.jiraEmail);
    if (user.jql !== expectedJql) {
        return '⚙️ Custom JQL';
    }

    const labels: string[] = [];
    if (scopes.assigned) labels.push('👤 Assigned to Me');
    if (scopes.created) labels.push('📝 Created by Me');
    if (scopes.participated) labels.push('🎯 Participated');
    if (scopes.watched) labels.push('👁️ Watched');

    if (projectScopes.length > 0) {
        labels.push(`📁 ${projectScopes.length} Project(s)`);
    }

    if (labels.length === 0) return '🌐 All Updates';
    return labels.join(', ');
}

/**
 * Telegram-based notifier with command handling for multi-user support.
 * Optionally encrypts API tokens before storing in MongoDB.
 */
export class TelegramNotifier implements Notifier {
    private bot: TelegramBot;
    private encryptionKey: string | null;

    constructor(token: string, encryptionKey?: string | null) {
        this.bot = new TelegramBot(token, { polling: true });
        this.encryptionKey = encryptionKey || null;

        // Handle polling errors gracefully
        this.bot.on('polling_error', (error: any) => {
            if (error.message && error.message.includes('ECONNRESET')) {
                console.log('[Telegram] Warning: Polling connection reset (transient network issue). Auto-reconnecting...');
            } else {
                console.error(`[Telegram] Polling error: ${error.message}`);
            }
        });

        this.registerCommands();
    }

    /**
     * Send notification to a specific chat.
     */
    async notify(payload: NotificationPayload, chatId?: string): Promise<void> {
        if (!chatId) {
            console.error('[Telegram] No chatId provided for notification.');
            return;
        }

        const messages = this.formatMessage(payload);
        for (let i = 0; i < messages.length; i++) {
            try {
                const isLastChunk = i === messages.length - 1;
                const options: TelegramBot.SendMessageOptions = { parse_mode: 'HTML' };

                if (isLastChunk) {
                    options.reply_markup = {
                        inline_keyboard: [
                            [
                                { text: '💬 Comment', callback_data: `comment_${payload.issueKey}` },
                                { text: '👤 Assign to Me', callback_data: `assign_${payload.issueKey}` }
                            ],
                            [
                                { text: '▶️ Transition Status', callback_data: `transition_${payload.issueKey}` }
                            ]
                        ]
                    };
                }

                await this.bot.sendMessage(chatId, messages[i], options);
            } catch (error) {
                console.error(
                    `[Telegram] Failed to send message chunk to ${chatId}:`,
                    (error as Error).message,
                );
            }
        }

        // Send attachments if any
        if (payload.attachments && payload.attachments.length > 0) {
            const photoVideos: { type: 'photo' | 'video', media: Buffer, filename: string }[] = [];
            const others: { buffer: Buffer; filename: string }[] = [];

            for (const attachment of payload.attachments) {
                const ext = attachment.filename.split('.').pop()?.toLowerCase();
                if (ext && ['png', 'jpg', 'jpeg'].includes(ext)) {
                    photoVideos.push({ type: 'photo', media: attachment.buffer, filename: attachment.filename });
                } else if (ext && ['mp4', 'mov'].includes(ext)) {
                    photoVideos.push({ type: 'video', media: attachment.buffer, filename: attachment.filename });
                } else {
                    others.push(attachment);
                }
            }

            if (photoVideos.length > 1) {
                const mediaGroup = photoVideos.map(pv => ({
                    type: pv.type,
                    media: pv.media,
                }));
                try {
                    await this.bot.sendMediaGroup(chatId, mediaGroup as any);
                } catch (error) {
                    console.error(`[Telegram] Failed to send media group to ${chatId}:`, (error as Error).message);
                    // Fallback to sending individually
                    for (const pv of photoVideos) {
                        try {
                            if (pv.type === 'photo') {
                                await this.bot.sendPhoto(chatId, pv.media, {}, { filename: pv.filename });
                            } else {
                                await this.bot.sendVideo(chatId, pv.media, {}, { filename: pv.filename });
                            }
                        } catch (fallbackError) {
                            console.error(`[Telegram] Fallback failed for ${pv.filename}:`, (fallbackError as Error).message);
                        }
                    }
                }
            } else if (photoVideos.length === 1) {
                const pv = photoVideos[0];
                try {
                    if (pv.type === 'photo') {
                        await this.bot.sendPhoto(chatId, pv.media, {}, { filename: pv.filename });
                    } else {
                        await this.bot.sendVideo(chatId, pv.media, {}, { filename: pv.filename });
                    }
                } catch (error) {
                    console.error(`[Telegram] Failed to send single media ${pv.filename}:`, (error as Error).message);
                }
            }

            for (const attachment of others) {
                try {
                    await this.bot.sendDocument(chatId, attachment.buffer, {}, { filename: attachment.filename });
                } catch (error) {
                    console.error(
                        `[Telegram] Failed to send document ${attachment.filename} to ${chatId}:`,
                        (error as Error).message,
                    );
                }
            }
        }
    }

    /**
     * Send an error notification.
     */
    async notifyError(message: string, chatId?: string): Promise<void> {
        if (!chatId) return;
        try {
            // Trim error to prevent telegram 4096 error if error stack is massive
            const trimmedMessage = message.length > 4000 ? message.substring(0, 4000) + '...' : message;
            await this.bot.sendMessage(chatId, `⚠️ <b>Target Action Required:</b>\n${trimmedMessage}`, { parse_mode: 'HTML' });
        } catch (error) {
            console.error(
                `[Telegram] Failed to send error to ${chatId}:`,
                (error as Error).message,
            );
        }
    }

    /**
     * Register Telegram command handlers.
     */
    private registerCommands(): void {
        // /start
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id.toString();
            const user = await User.findOne({ chatId });

            if (user) {
                user.isActive = true;
                await user.save();
                await this.bot.sendMessage(
                    chatId,
                    '▶️ Monitoring resumed. Use /stop to pause.\nUse /help for more instructions.',
                );
                console.log(`[Telegram] User ${chatId} resumed monitoring.`);
            } else {
                await this.bot.sendMessage(
                    chatId,
                    `👋 Welcome to <b>Jira Monitor Bot</b>!\n\n` +
                    `Please use <code>/help</code> to see instructions on how to set up and use the bot.`,
                    { parse_mode: 'HTML' },
                );
            }
        });

        // /help
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id.toString();
            await this.bot.sendMessage(
                chatId,
                `📖 <b>Jira Monitor Bot Guide</b>\n\n` +
                `<b>1. Setup</b>\n` +
                `Use <code>/setup &lt;host&gt; &lt;email&gt; &lt;token&gt;</code> to register your Jira credentials. You can also append a custom JQL at the end.\n\n` +
                `<b>2. Notification Settings</b>\n` +
                `Use <code>/settings</code> to open an interactive menu to choose which issues to track (e.g. Assigned to Me, Created by Me, Participated, Watched), toggle field tracking, and set your timezone.\n\n` +
                `<b>3. Commands</b>\n` +
                `  /start — Resume monitoring\n` +
                `  /stop — Pause monitoring\n` +
                `  /status — Check your current monitoring status and scope\n` +
                `  /settings — Configure tracking preferences and active hours\n` +
                `  /tz &lt;timezone&gt; — Automatically set your timezone (e.g., <code>/tz Asia/Ho_Chi_Minh</code>)\n` +
                `  /jql &lt;query&gt; — Override relationship scopes with a custom JQL filter\n` +
                `  /help — Show this help message`,
                { parse_mode: 'HTML' },
            );
        });

        // /setup <host> <email> <token> [jql]
        this.bot.onText(/\/setup (.+)/, async (msg, match) => {
            const chatId = msg.chat.id.toString();
            const args = match![1].split(' ');

            if (args.length < 3) {
                await this.bot.sendMessage(
                    chatId,
                    '❌ Usage: <code>/setup &lt;host&gt; &lt;email&gt; &lt;token&gt; [jql]</code>',
                    { parse_mode: 'HTML' },
                );
                return;
            }

            const [host, email, token, ...jqlParts] = args;
            const jql = jqlParts.length > 0 ? jqlParts.join(' ') : buildJql({ assigned: true, created: true, participated: false, watched: false }, [], email);

            // Encrypt the token if encryption key is available
            const storedToken = this.encryptionKey
                ? encrypt(token, this.encryptionKey)
                : token;

            try {
                await User.findOneAndUpdate(
                    { chatId },
                    {
                        jiraHost: host,
                        jiraEmail: email,
                        jiraApiToken: storedToken,
                        jql,
                        isActive: true,
                        'preferences.relationshipScopes': {
                            assigned: true,
                            created: true,
                            participated: false,
                            watched: false
                        }
                    },
                    { upsert: true, new: true },
                );

                const encStatus = this.encryptionKey ? '🔒 Encrypted' : '⚠️ Unencrypted';
                await this.bot.sendMessage(
                    chatId,
                    `✅ Configuration saved!\n\n` +
                    `<b>Host:</b> ${this.escapeHtml(host)}\n` +
                    `<b>Email:</b> ${this.escapeHtml(email)}\n` +
                    `<b>Token:</b> ${encStatus}\n` +
                    `<b>JQL:</b> ${this.escapeHtml(jql)}\n\n` +
                    `Monitoring will start on the next poll cycle.`,
                    { parse_mode: 'HTML' },
                );
                console.log(`[Telegram] User ${chatId} registered. Token ${encStatus}.`);
            } catch (error) {
                await this.bot.sendMessage(chatId, '❌ Failed to save configuration.');
                console.error(
                    `[Telegram] Failed to save user ${chatId}:`,
                    (error as Error).message,
                );
            }
        });

        // /status
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id.toString();
            const user = await User.findOne({ chatId });

            if (!user) {
                await this.bot.sendMessage(
                    chatId,
                    '⚠️ You are not registered. Use /setup to get started.',
                );
                return;
            }

            const statusEmoji = user.isActive ? '🟢' : '🔴';
            const scopeLabel = getScopeLabel(user);
            await this.bot.sendMessage(
                chatId,
                `${statusEmoji} <b>Status:</b> ${user.isActive ? 'Active' : 'Stopped'}\n` +
                `<b>Host:</b> ${this.escapeHtml(user.jiraHost)}\n` +
                `<b>Email:</b> ${this.escapeHtml(user.jiraEmail)}\n` +
                `<b>Scope:</b> ${scopeLabel}\n` +
                `<b>JQL:</b> ${this.escapeHtml(user.jql)}`,
                { parse_mode: 'HTML' },
            );
        });

        // /stop
        this.bot.onText(/\/stop/, async (msg) => {
            const chatId = msg.chat.id.toString();
            const user = await User.findOneAndUpdate(
                { chatId },
                { isActive: false },
            );

            if (!user) {
                await this.bot.sendMessage(chatId, '⚠️ You are not registered.');
                return;
            }

            await this.bot.sendMessage(
                chatId,
                '🔴 Monitoring stopped. Use /start to resume.',
            );
            console.log(`[Telegram] User ${chatId} stopped monitoring.`);
        });

        // /jql <query>
        this.bot.onText(/\/jql (.+)/, async (msg, match) => {
            const chatId = msg.chat.id.toString();
            const newJql = match![1].trim();

            const user = await User.findOneAndUpdate(
                { chatId },
                { jql: newJql },
                { new: true }
            );

            if (!user) {
                await this.bot.sendMessage(chatId, '⚠️ You are not registered. Use /setup first.');
                return;
            }

            await this.bot.sendMessage(
                chatId,
                `✅ JQL updated to:\n<code>${this.escapeHtml(newJql)}</code>`,
                { parse_mode: 'HTML' },
            );
            console.log(`[Telegram] User ${chatId} updated JQL.`);
        });

        // /settings
        this.bot.onText(/\/settings/, async (msg) => {
            const chatId = msg.chat.id.toString();
            await this.sendSettingsMenu(chatId);
        });

        // Callback queries for interactive menus
        this.bot.on('callback_query', async (query) => {
            const chatId = query.message?.chat.id.toString();
            const messageId = query.message?.message_id;
            const data = query.data;

            if (!chatId || !messageId || !data) return;

            try {
                const user = await User.findOne({ chatId });
                if (!user) {
                    await this.bot.answerCallbackQuery(query.id, { text: 'User not found. Use /setup first.', show_alert: true });
                    return;
                }

                if (data === 'toggle_status') {
                    user.preferences.trackStatus = !user.preferences.trackStatus;
                } else if (data === 'toggle_assignee') {
                    user.preferences.trackAssignee = !user.preferences.trackAssignee;
                } else if (data === 'set_timezone') {
                    await this.bot.answerCallbackQuery(query.id, {
                        text: 'To set timezone, use: /tz <timezone> (e.g., /tz Asia/Ho_Chi_Minh)',
                        show_alert: true
                    });
                    return;
                } else if (data === 'scope_assigned') {
                    user.preferences.relationshipScopes.assigned = !user.preferences.relationshipScopes.assigned;
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes || [], user.jiraEmail);
                } else if (data === 'scope_created') {
                    user.preferences.relationshipScopes.created = !user.preferences.relationshipScopes.created;
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes || [], user.jiraEmail);
                } else if (data === 'scope_participated') {
                    user.preferences.relationshipScopes.participated = !user.preferences.relationshipScopes.participated;
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes || [], user.jiraEmail);
                } else if (data === 'scope_watched') {
                    user.preferences.relationshipScopes.watched = !user.preferences.relationshipScopes.watched;
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes || [], user.jiraEmail);
                } else if (data === 'select_projects') {
                    await this.bot.answerCallbackQuery(query.id);
                    await this.showProjectMenu(chatId, messageId, user);
                    return;
                } else if (data === 'toggle_all_proj') {
                    let apiToken = user.jiraApiToken;
                    if (this.encryptionKey) {
                        try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
                    }
                    const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
                    const projects = await jiraClient.getAllProjects();
                    const allProjectKeys = projects.map(p => p.key);
                    const currentScopes = user.preferences.projectScopes || [];

                    if (currentScopes.length === allProjectKeys.length && allProjectKeys.length > 0) {
                        user.preferences.projectScopes = [];
                    } else {
                        user.preferences.projectScopes = allProjectKeys;
                    }
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes, user.jiraEmail);
                    await user.save();

                    await this.bot.answerCallbackQuery(query.id, { text: `Project selection updated!` });
                    await this.showProjectMenu(chatId, messageId, user);
                    return;
                } else if (data.startsWith('toggle_proj_')) {
                    const projKey = data.replace('toggle_proj_', '');
                    const currentScopes = user.preferences.projectScopes || [];
                    if (currentScopes.includes(projKey)) {
                        user.preferences.projectScopes = currentScopes.filter(k => k !== projKey);
                    } else {
                        user.preferences.projectScopes = [...currentScopes, projKey];
                    }
                    user.jql = buildJql(user.preferences.relationshipScopes, user.preferences.projectScopes, user.jiraEmail);
                    await user.save();

                    await this.bot.answerCallbackQuery(query.id, { text: `Project ${projKey} updated!` });
                    await this.showProjectMenu(chatId, messageId, user);
                    return;
                } else if (data === 'back_to_settings') {
                    await this.bot.answerCallbackQuery(query.id);
                    const { text, replyMarkup } = this.buildSettingsMenu(user);
                    await this.bot.editMessageText(text, {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: replyMarkup,
                        parse_mode: 'HTML',
                    });
                    return;
                } else if (data.startsWith('comment_')) {
                    const issueKey = data.split('_')[1];
                    await this.bot.answerCallbackQuery(query.id);
                    await this.bot.sendMessage(chatId, `Please type your comment for ${issueKey}:`, {
                        reply_markup: {
                            force_reply: true,
                            selective: true
                        }
                    });
                    return;
                } else if (data.startsWith('assign_')) {
                    const issueKey = data.split('_')[1];
                    let apiToken = user.jiraApiToken;
                    if (this.encryptionKey) {
                        try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
                    }
                    const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
                    const accountId = await jiraClient.getCurrentUserAccountId();
                    if (accountId) {
                        const success = await jiraClient.assignIssue(issueKey, accountId);
                        await this.bot.answerCallbackQuery(query.id, {
                            text: success ? `Assigned ${issueKey} to you!` : `Failed to assign ${issueKey}.`,
                            show_alert: true
                        });
                    } else {
                        await this.bot.answerCallbackQuery(query.id, { text: 'Could not fetch your account ID.', show_alert: true });
                    }
                    return;
                } else if (data.startsWith('transition_')) {
                    const issueKey = data.split('_')[1];
                    let apiToken = user.jiraApiToken;
                    if (this.encryptionKey) {
                        try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
                    }
                    const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
                    const transitions = await jiraClient.getTransitions(issueKey);

                    if (transitions.length === 0) {
                        await this.bot.answerCallbackQuery(query.id, { text: `No transitions available for ${issueKey}.`, show_alert: true });
                        return;
                    }

                    const keyboard = transitions.map(t => [{
                        text: t.name,
                        callback_data: `dotransition_${issueKey}_${t.id}`
                    }]);

                    // Add a cancel button
                    keyboard.push([{ text: '❌ Cancel', callback_data: `cancel_transition` }]);

                    await this.bot.answerCallbackQuery(query.id);
                    await this.bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: chatId, message_id: messageId });
                    return;
                } else if (data.startsWith('dotransition_')) {
                    const [, issueKey, transitionId] = data.split('_');
                    let apiToken = user.jiraApiToken;
                    if (this.encryptionKey) {
                        try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
                    }
                    const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
                    const success = await jiraClient.transitionIssue(issueKey, transitionId);

                    await this.bot.answerCallbackQuery(query.id, {
                        text: success ? `Transitioned ${issueKey} successfully!` : `Failed to transition ${issueKey}.`,
                        show_alert: true
                    });

                    // Restore the original quick action buttons
                    if (success) {
                        await this.bot.editMessageReplyMarkup({
                            inline_keyboard: [
                                [
                                    { text: '💬 Comment', callback_data: `comment_${issueKey}` },
                                    { text: '👤 Assign to Me', callback_data: `assign_${issueKey}` }
                                ],
                                [
                                    { text: '▶️ Transition Status', callback_data: `transition_${issueKey}` }
                                ]
                            ]
                        }, { chat_id: chatId, message_id: messageId });
                    }
                    return;
                } else if (data === 'cancel_transition') {
                    await this.bot.answerCallbackQuery(query.id);
                    // We don't have the issueKey directly in the cancel data, but we can't easily restore the exact previous keyboard without it. 
                    // To keep it simple, we just clear the keyboard or try to parse the message text to find the issue key, but clearing is safer.
                    await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
                    return;
                }

                await user.save();
                await this.bot.answerCallbackQuery(query.id, { text: 'Settings updated!' });

                // Refresh the menu
                const { text, replyMarkup } = this.buildSettingsMenu(user);
                await this.bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: replyMarkup,
                    parse_mode: 'HTML',
                });
            } catch (error) {
                console.error(`[Telegram] Error handling callback query:`, error);
                await this.bot.answerCallbackQuery(query.id, { text: 'An error occurred.', show_alert: true });
            }
        });

        // /tz <timezone>
        this.bot.onText(/\/tz (.+)/, async (msg, match) => {
            const chatId = msg.chat.id.toString();
            const newTz = match![1].trim();

            try {
                // Validate timezone string
                Intl.DateTimeFormat(undefined, { timeZone: newTz });

                const user = await User.findOneAndUpdate(
                    { chatId },
                    { 'preferences.schedule.timezone': newTz },
                    { new: true }
                );

                if (!user) {
                    await this.bot.sendMessage(chatId, '⚠️ You are not registered. Use /setup first.');
                    return;
                }

                await this.bot.sendMessage(chatId, `✅ Timezone updated to <b>${newTz}</b>.`, { parse_mode: 'HTML' });
            } catch (e) {
                await this.bot.sendMessage(chatId, `❌ Invalid timezone string: <b>${newTz}</b>.\nPlease use IANA formats like <code>Asia/Ho_Chi_Minh</code> or <code>UTC</code>.`, { parse_mode: 'HTML' });
            }
        });

        // Listen for ForceReply messages (for comments)
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id.toString();
            if (msg.reply_to_message && msg.reply_to_message.text) {
                const text = msg.reply_to_message.text;
                // Check if this is a reply to our comment prompt
                if (text.startsWith('Please type your comment for ')) {
                    const issueKey = text.replace('Please type your comment for ', '').replace(':', '').trim();
                    const commentBody = msg.text;

                    if (!commentBody) return;

                    try {
                        const user = await User.findOne({ chatId });
                        if (!user) return;

                        let apiToken = user.jiraApiToken;
                        if (this.encryptionKey) {
                            try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
                        }

                        const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
                        const success = await jiraClient.addComment(issueKey, commentBody);

                        if (success) {
                            await this.bot.sendMessage(chatId, `✅ Comment added to ${issueKey}.`);
                        } else {
                            await this.bot.sendMessage(chatId, `❌ Failed to add comment to ${issueKey}.`);
                        }
                    } catch (error) {
                        console.error(`[Telegram] Error adding comment:`, error);
                    }
                }
            }
        });

        console.log('[Telegram] Commands registered: /start, /help, /setup, /status, /stop, /jql, /settings, /tz');
    }

    private async sendSettingsMenu(chatId: string): Promise<void> {
        const user = await User.findOne({ chatId });
        if (!user) {
            await this.bot.sendMessage(chatId, '⚠️ You are not registered. Use /setup first.');
            return;
        }

        const { text, replyMarkup } = this.buildSettingsMenu(user);
        await this.bot.sendMessage(chatId, text, {
            reply_markup: replyMarkup,
            parse_mode: 'HTML',
        });
    }

    private buildSettingsMenu(user: any) {
        const p = user.preferences || {
            trackStatus: true,
            trackAssignee: true,
            relationshipScopes: { assigned: true, created: true, participated: false, watched: false },
            projectScopes: [],
            schedule: { timezone: 'UTC', startTime: '00:00', endTime: '23:59' }
        };

        const statusIcon = p.trackStatus ? '✅' : '❌';
        const assigneeIcon = p.trackAssignee ? '✅' : '❌';

        const scopes = p.relationshipScopes || { assigned: true, created: true, participated: false, watched: false };
        const projectScopesCount = p.projectScopes ? p.projectScopes.length : 0;

        const scopeLabel = getScopeLabel(user);

        const text = `⚙️ <b>Notification Settings</b>\n\n` +
            `<b>Scope:</b> ${scopeLabel}\n` +
            `<b>Timezone:</b> ${p.schedule.timezone}\n` +
            `<b>Active Hours:</b> ${p.schedule.startTime} - ${p.schedule.endTime}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: `${scopes.assigned ? '✅' : '❌'} Assigned`, callback_data: 'scope_assigned' },
                    { text: `${scopes.created ? '✅' : '❌'} Created`, callback_data: 'scope_created' },
                ],
                [
                    { text: `${scopes.participated ? '✅' : '❌'} Participated`, callback_data: 'scope_participated' },
                    { text: `${scopes.watched ? '✅' : '❌'} Watched`, callback_data: 'scope_watched' },
                ],
                [
                    { text: `📁 Select Projects (${projectScopesCount})`, callback_data: 'select_projects' }
                ],
                [
                    { text: `${statusIcon} Track Status`, callback_data: 'toggle_status' },
                    { text: `${assigneeIcon} Track Assignee`, callback_data: 'toggle_assignee' }
                ],
                [
                    { text: `🌐 Set Timezone`, callback_data: 'set_timezone' }
                ]
            ]
        };

        return { text, replyMarkup };
    }

    private async showProjectMenu(chatId: string, messageId: number, user: any) {
        let apiToken = user.jiraApiToken;
        if (this.encryptionKey) {
            try { apiToken = decrypt(apiToken, this.encryptionKey); } catch (e) { }
        }

        const jiraClient = new JiraClient(user.jiraHost, user.jiraEmail, apiToken);
        const projects = await jiraClient.getAllProjects();
        const activeProjects = user.preferences.projectScopes || [];

        let text = `📂 <b>Project Subscriptions</b>\n\nSelect the projects you want to monitor closely:\n`;

        const inline_keyboard: any[][] = [];

        if (projects.length === 0) {
            text += `\n<i>Could not load projects. Ensure your Jira credentials are valid.</i>`;
        } else {
            const allSelected = activeProjects.length === projects.length && projects.length > 0;
            const toggleAllIcon = allSelected ? '❌ Deselect All' : '✅ Select All';
            inline_keyboard.push([{ text: toggleAllIcon, callback_data: 'toggle_all_proj' }]);

            // Render buttons row by row (2 per row for better mobile display)
            let currentRow: any[] = [];
            projects.forEach((proj: any) => {
                const isActive = activeProjects.includes(proj.key);
                const icon = isActive ? '✅' : '❌';
                currentRow.push({
                    text: `${icon} ${proj.key}`,
                    callback_data: `toggle_proj_${proj.key}`
                });
                if (currentRow.length === 2) {
                    inline_keyboard.push(currentRow);
                    currentRow = [];
                }
            });
            if (currentRow.length > 0) {
                inline_keyboard.push(currentRow);
            }
        }

        // Add back button
        inline_keyboard.push([
            { text: '⬅️ Back to Settings', callback_data: 'back_to_settings' }
        ]);

        await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard },
            parse_mode: 'HTML'
        });
    }

    private formatMessage(payload: NotificationPayload): string[] {
        const issueUrl = `${payload.host}/browse/${payload.issueKey}`;
        const lines: string[] = [];

        if (payload.isNew) {
            lines.push(
                `✨ <b>New Task: <a href="${issueUrl}">${payload.issueKey}</a></b>`,
                `<b>Summary:</b> ${this.escapeHtml(payload.summary)}`,
                ``,
                `<b>Status:</b> ${this.escapeHtml(payload.status)} | <b>Assignee:</b> ${this.escapeHtml(payload.assignee || 'Unassigned')}`
            );
        } else {
            lines.push(
                `🔔 <b><a href="${issueUrl}">${payload.issueKey}</a>: ${this.escapeHtml(payload.summary)}</b>`,
            );
        }

        if (payload.diffs && payload.diffs.length > 0) {
            lines.push(``, `<b>${payload.isNew ? 'Details' : 'Changes'}:</b>`);
            for (const diff of payload.diffs) {
                const oldVal = diff.oldValue || '<i>None</i>';
                const newVal = diff.newValue || '<i>None</i>';

                const oldStr = oldVal === '<i>None</i>' ? oldVal : this.escapeHtml(oldVal);
                const newStr = newVal === '<i>None</i>' ? newVal : this.escapeHtml(newVal);

                if (payload.isNew) {
                    lines.push(`• <i>${this.escapeHtml(diff.field)}</i>: ${newStr}`);
                } else {
                    lines.push(`• <i>${this.escapeHtml(diff.field)}</i>: ${oldStr} ➡️ ${newStr}`);
                }
            }
        } else if (!payload.isNew) {
            // Fallback if no diffs provided but not explicitly new
            lines.push(
                ``,
                `<b>Status:</b> ${this.escapeHtml(payload.status)}`,
                `<b>Assignee:</b> ${this.escapeHtml(payload.assignee || 'Unassigned')}`,
            );
        }

        // Format timestamp based on user timezone
        const tz = payload.userTimezone || 'UTC';
        let timeString = '';
        try {
            timeString = new Intl.DateTimeFormat('en-GB', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(payload.detectedAt);
        } catch (e) {
            // Fallback if timezone is somehow invalid
            timeString = payload.detectedAt.toISOString();
        }

        lines.push(
            ``,
            `🕒 <i>Updated at: ${timeString}</i>`,
        );

        // Telegram max characters is 4096, but we need room for HTML tags. Safely split at 4000.
        const chunks: string[] = [];
        let currentChunk = '';

        for (const line of lines) {
            // If a single line is absurdly long (>4000 chars), we chunk the line itself
            if (line.length > 4000) {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                // Break precisely while maintaining chunks <= 4000
                let remaining = line;
                while (remaining.length > 0) {
                    if (remaining.length <= 4000) {
                        chunks.push(remaining);
                        break;
                    }

                    // Strict cut at 4000 to avoid infinite loops, we don't try to be too smart about HTML
                    // because complex HTML parsing is overkill here and might break.
                    chunks.push(remaining.substring(0, 4000));
                    remaining = remaining.substring(4000);
                }
                continue;
            }

            if (currentChunk.length + line.length + 1 > 4000) {
                chunks.push(currentChunk.trim());
                currentChunk = line + '\n';
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
