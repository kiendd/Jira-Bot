import TelegramBot from 'node-telegram-bot-api';
import { Notifier, NotificationPayload } from './notifier';
import { User } from '../models/user';
import { encrypt } from './encryption';

const JQL_SCOPES = {
    MINE: 'assignee = currentUser() OR reporter = currentUser() AND updated > -1d',
    WATCHED: 'watcher = currentUser() AND updated > -1d',
    ALL: 'updated > -1d'
};

function getScopeLabel(jql: string): string {
    if (jql === JQL_SCOPES.MINE) return '👤 My Issues';
    if (jql === JQL_SCOPES.WATCHED) return '👁️ Watched';
    if (jql === JQL_SCOPES.ALL) return '🌐 All Updates';
    return '⚙️ Custom JQL';
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

        const message = this.formatMessage(payload);
        try {
            await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error(
                `[Telegram] Failed to send message to ${chatId}:`,
                (error as Error).message,
            );
        }
    }

    /**
     * Send an error notification.
     */
    async notifyError(message: string, chatId?: string): Promise<void> {
        if (!chatId) return;
        try {
            await this.bot.sendMessage(chatId, `⚠️ <b>Target Action Required:</b>\n${message}`, { parse_mode: 'HTML' });
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
                    '▶️ Monitoring resumed. Use /stop to pause.',
                );
                console.log(`[Telegram] User ${chatId} resumed monitoring.`);
            } else {
                await this.bot.sendMessage(
                    chatId,
                    `👋 Welcome to <b>Jira Monitor Bot</b>!\n\n` +
                    `Use <code>/setup &lt;host&gt; &lt;email&gt; &lt;token&gt;</code> to register.\n` +
                    `Use <code>/setup &lt;host&gt; &lt;email&gt; &lt;token&gt; &lt;jql&gt;</code> to register with custom JQL.\n\n` +
                    `Other commands:\n` +
                    `  /status — Check monitoring status\n` +
                    `  /stop — Stop monitoring\n` +
                    `  /jql &lt;query&gt; — Update your JQL filter\n` +
                    `  /settings — Configure preferences\n` +
                    `  /start — Resume monitoring\n`,
                    { parse_mode: 'HTML' },
                );
            }
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
            const jql = jqlParts.length > 0 ? jqlParts.join(' ') : 'updated > -1d';

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
            const scopeLabel = getScopeLabel(user.jql);
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
                } else if (data === 'scope_mine') {
                    user.jql = JQL_SCOPES.MINE;
                } else if (data === 'scope_watched') {
                    user.jql = JQL_SCOPES.WATCHED;
                } else if (data === 'scope_all') {
                    user.jql = JQL_SCOPES.ALL;
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

        console.log('[Telegram] Commands registered: /start, /setup, /status, /stop, /jql, /settings, /tz');
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
            schedule: { timezone: 'UTC', startTime: '00:00', endTime: '23:59' }
        };

        const statusIcon = p.trackStatus ? '✅' : '❌';
        const assigneeIcon = p.trackAssignee ? '✅' : '❌';

        const scopeLabel = getScopeLabel(user.jql);

        const text = `⚙️ <b>Notification Settings</b>\n\n` +
            `<b>Scope:</b> ${scopeLabel}\n` +
            `<b>Timezone:</b> ${p.schedule.timezone}\n` +
            `<b>Active Hours:</b> ${p.schedule.startTime} - ${p.schedule.endTime}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: `👤 My Issues`, callback_data: 'scope_mine' },
                    { text: `👁️ Watched`, callback_data: 'scope_watched' },
                    { text: `🌐 All Updates`, callback_data: 'scope_all' },
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

    private formatMessage(payload: NotificationPayload): string {
        const issueUrl = `${payload.host}/browse/${payload.issueKey}`;
        const lines = [
            `🔔 <b>Jira Issue Updated</b>: <a href="${issueUrl}">${payload.issueKey}</a>`,
            ``,
            `<b>Summary:</b> ${this.escapeHtml(payload.summary)}`,
        ];

        if (payload.diffs && payload.diffs.length > 0) {
            lines.push(``, `<b>Changes:</b>`);
            for (const diff of payload.diffs) {
                const oldVal = diff.oldValue || '<i>None</i>';
                const newVal = diff.newValue || '<i>None</i>';
                lines.push(`• <i>${this.escapeHtml(diff.field)}</i>: ${this.escapeHtml(oldVal)} ➡️ ${this.escapeHtml(newVal)}`);
            }
        } else {
            // Fallback if no diffs provided
            lines.push(
                `<b>Status:</b> ${this.escapeHtml(payload.status)}`,
                `<b>Assignee:</b> ${this.escapeHtml(payload.assignee || 'Unassigned')}`,
            );
        }

        lines.push(
            ``,
            `<i>Detected at:</i> ${payload.detectedAt.toISOString()}`,
            `<i>Stable since:</i> ${payload.stabilizedAt.toISOString()}`,
        );
        return lines.join('\n');
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
