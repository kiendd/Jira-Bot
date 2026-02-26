import { JiraClient, JiraIssue } from './jira-client';
import { FieldDiff, Notifier, NotificationPayload } from './notifier';
import { IUser, User } from '../models/user';
import { IssueState } from '../models/issue-state';
import { decrypt } from './encryption';

/**
 * Tracks the state of a pending notification for a single issue.
 */
interface PendingChange {
    host: string;
    issueKey: string;
    summary: string;
    status: string;
    assignee: string | null;
    diffs: FieldDiff[];
    firstDetectedAt: Date;
    lastChangeTime: Date;
}

export class MonitorService {
    private notifier: Notifier;
    private pollIntervalMs: number;
    private debounceWindowMs: number;
    private encryptionKey: string | null;

    /**
     * Per-user pending changes.
     * Key: chatId, Value: Map<issueKey, PendingChange>
     */
    private pendingByUser: Map<string, Map<string, PendingChange>> = new Map();

    /**
     * Track which users have completed their first poll (baseline).
     */
    private initializedUsers: Set<string> = new Set();

    private pollTimer: NodeJS.Timeout | null = null;

    constructor(
        notifier: Notifier,
        pollIntervalMs: number,
        debounceWindowMs: number,
        encryptionKey?: string | null,
    ) {
        this.notifier = notifier;
        this.pollIntervalMs = pollIntervalMs;
        this.debounceWindowMs = debounceWindowMs;
        this.encryptionKey = encryptionKey || null;
    }

    /**
     * Start the monitoring loop.
     */
    async start(): Promise<void> {
        console.log('[Monitor] Starting multi-user monitor service...');
        console.log(`[Monitor] Poll interval: ${this.pollIntervalMs}ms`);
        console.log(`[Monitor] Debounce window: ${this.debounceWindowMs}ms`);

        // Run first poll immediately
        await this.pollAllUsers();

        // Schedule subsequent polls
        this.pollTimer = setInterval(async () => {
            try {
                await this.pollAllUsers();
            } catch (error) {
                console.error('[Monitor] Poll error:', (error as Error).message);
            }
        }, this.pollIntervalMs);
    }

    /**
     * Stop the monitoring loop.
     */
    stop(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        console.log('[Monitor] Stopped.');
    }

    /**
     * Poll all active users.
     */
    private async pollAllUsers(): Promise<void> {
        const now = new Date();
        console.log(`[Monitor] Polling all users at ${now.toISOString()}...`);

        const users = await User.find({ isActive: true });
        console.log(`[Monitor] Found ${users.length} active user(s).`);

        for (const user of users) {
            try {
                await this.pollUser(user, now);
            } catch (error) {
                console.error(
                    `[Monitor] Error polling user ${user.chatId}:`,
                    (error as Error).message,
                );
            }
        }
    }

    /**
     * Execute a single poll cycle for one user.
     */
    private async pollUser(user: IUser, now: Date): Promise<void> {
        const chatId = user.chatId;

        // Decrypt token if encryption is enabled
        let apiToken = user.jiraApiToken;
        if (this.encryptionKey) {
            try {
                apiToken = decrypt(apiToken, this.encryptionKey);
            } catch (error) {
                console.error(
                    `[Monitor] User ${chatId}: Failed to decrypt token:`,
                    (error as Error).message,
                );
                return;
            }
        }

        // Create Jira client for this user
        const jiraClient = new JiraClient(
            user.jiraHost,
            user.jiraEmail,
            apiToken,
        );

        let issues: JiraIssue[];
        try {
            issues = await jiraClient.searchIssues(user.jql);
        } catch (error) {
            const msg = (error as Error).message;
            console.error(
                `[Monitor] User ${chatId}: Failed to fetch issues:`,
                msg,
            );

            if (msg.includes('401') || msg.includes('403')) {
                console.log(`[Monitor] User ${chatId} auth failed. Disabling user.`);
                user.isActive = false;
                await user.save();
                if (this.notifier.notifyError) {
                    await this.notifier.notifyError(
                        'Jira Authentication failed (Token expired or invalid). Monitoring has been stopped. Please update your token by re-registering with <code>/setup</code>.',
                        chatId
                    );
                }
            } else if (msg.includes('429')) {
                console.log(`[Monitor] User ${chatId} rate limited (HTTP 429). Skipping this cycle.`);
            }

            return;
        }

        console.log(
            `[Monitor] User ${chatId}: Fetched ${issues.length} issues.`,
        );

        // Get stored states for this user
        const storedStates = await IssueState.find({ chatId });
        const stateMap = new Map(
            storedStates.map((s) => [s.issueKey, s]),
        );

        const isFirstPoll = !this.initializedUsers.has(chatId);

        // Ensure pending map exists for this user
        if (!this.pendingByUser.has(chatId)) {
            this.pendingByUser.set(chatId, new Map());
        }
        const pendingChanges = this.pendingByUser.get(chatId)!;

        for (const issue of issues) {
            const previousState = stateMap.get(issue.key);
            const hasChanged = !previousState || previousState.lastUpdated !== issue.updated;

            // Generate field diffs
            const diffs: FieldDiff[] = [];
            if (previousState && hasChanged) {
                if (previousState.status !== issue.status) {
                    diffs.push({ field: 'Status', oldValue: previousState.status, newValue: issue.status });
                }
                if (previousState.assignee !== (issue.assignee || null)) {
                    diffs.push({ field: 'Assignee', oldValue: previousState.assignee || 'Unassigned', newValue: issue.assignee || 'Unassigned' });
                }
            }

            // Update DB state
            await IssueState.findOneAndUpdate(
                { chatId, issueKey: issue.key },
                {
                    lastUpdated: issue.updated,
                    status: issue.status,
                    assignee: issue.assignee,
                },
                { upsert: true },
            );

            // Skip change tracking on first poll (baseline)
            if (isFirstPoll) continue;

            if (hasChanged && previousState) {
                // Change detected!
                const pending = pendingChanges.get(issue.key);
                if (pending) {
                    pending.lastChangeTime = now;
                    pending.summary = issue.summary;
                    pending.status = issue.status;
                    pending.assignee = issue.assignee;

                    // Merge new diffs, favoring the original oldValue for the same field
                    for (const diff of diffs) {
                        const existingDiff = pending.diffs.find(d => d.field === diff.field);
                        if (existingDiff) {
                            existingDiff.newValue = diff.newValue;
                        } else {
                            pending.diffs.push(diff);
                        }
                    }

                    console.log(
                        `[Monitor] User ${chatId}: Issue ${issue.key} changed again. Resetting debounce.`,
                    );
                } else {
                    pendingChanges.set(issue.key, {
                        host: user.jiraHost,
                        issueKey: issue.key,
                        summary: issue.summary,
                        status: issue.status,
                        assignee: issue.assignee,
                        diffs,
                        firstDetectedAt: now,
                        lastChangeTime: now,
                    });
                    console.log(
                        `[Monitor] User ${chatId}: Issue ${issue.key} changed. Added to pending.`,
                    );
                }
            }
        }

        if (isFirstPoll) {
            this.initializedUsers.add(chatId);
            console.log(
                `[Monitor] User ${chatId}: First poll complete. Baseline established.`,
            );
            return;
        }

        // Check stability and send notifications
        await this.checkStability(chatId, pendingChanges, now);
    }

    /**
     * Check pending changes for stability and send notifications.
     */
    private async checkStability(
        chatId: string,
        pendingChanges: Map<string, PendingChange>,
        now: Date,
    ): Promise<void> {
        const user = await User.findOne({ chatId });
        if (!user) return;

        const prefs = user.preferences || {
            trackStatus: true,
            trackAssignee: true,
            schedule: { timezone: 'UTC', activeDays: [1, 2, 3, 4, 5], startTime: '00:00', endTime: '23:59' }
        };

        const toNotify: PendingChange[] = [];

        for (const [key, pending] of pendingChanges) {
            const age = now.getTime() - pending.lastChangeTime.getTime();
            if (age >= this.debounceWindowMs) {
                // Filter diffs based on preferences
                const filteredDiffs = pending.diffs.filter(diff => {
                    if (diff.field === 'Status' && !prefs.trackStatus) return false;
                    if (diff.field === 'Assignee' && !prefs.trackAssignee) return false;
                    return true;
                });

                // Check if we still have changes to notify after filtering
                if (filteredDiffs.length > 0 || pending.diffs.length === 0) {
                    pending.diffs = filteredDiffs;
                    toNotify.push(pending);
                } else {
                    // Changes were only for untracked fields, discard immediately
                    pendingChanges.delete(key);
                }
            }
        }

        // Check if we're currently inside working hours
        if (toNotify.length > 0) {
            try {
                const tz = prefs.schedule.timezone;
                const formatterOptions: Intl.DateTimeFormatOptions = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long' };
                const dtFormatter = new Intl.DateTimeFormat('en-US', formatterOptions);
                const parts = dtFormatter.formatToParts(now);

                const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
                const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
                const weekdayPartStr = parts.find(p => p.type === 'weekday')?.value || 'Monday';

                const currentHm = `${hourPart}:${minutePart}`;
                const weekdays: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                const currentDay = weekdays[weekdayPartStr];

                const isWorkDay = prefs.schedule.activeDays.includes(currentDay);
                const isWorkHour = currentHm >= prefs.schedule.startTime && currentHm <= prefs.schedule.endTime;

                if (!isWorkDay || !isWorkHour) {
                    console.log(`[Monitor] User ${chatId} is outside working hours. Queuing ${toNotify.length} notifications.`);
                    return; // Do not delete from pendingChanges or notify yet
                }
            } catch (e) {
                console.error(`[Monitor] Timezone error for ${chatId}, ignoring schedule:`, e);
            }
        }

        for (const pending of toNotify) {
            // Remove from pending map now that we are actually sending
            pendingChanges.delete(pending.issueKey);

            const payload: NotificationPayload = {
                host: pending.host,
                issueKey: pending.issueKey,
                summary: pending.summary,
                status: pending.status,
                assignee: pending.assignee,
                diffs: pending.diffs,
                detectedAt: pending.firstDetectedAt,
                stabilizedAt: now,
            };

            try {
                await this.notifier.notify(payload, chatId);
                console.log(
                    `[Monitor] Notification sent to ${chatId} for ${pending.issueKey}.`,
                );
            } catch (error) {
                console.error(
                    `[Monitor] Failed to notify ${chatId} for ${pending.issueKey}:`,
                    (error as Error).message,
                );
            }
        }
    }
}
