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
    isNew?: boolean;
    attachments?: { filename: string; buffer: Buffer }[];
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
        } catch (error: any) {
            const msg = error.message;
            const detail = error.response?.data?.errorMessages?.join(', ') || error.response?.data?.errorMessages || '';
            console.error(
                `[Monitor] User ${chatId}: Failed to fetch issues (JQL: ${user.jql}):`,
                msg,
                detail
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
            const isNewTask = !previousState && !isFirstPoll;
            const hasChanged = (!previousState && isFirstPoll) || (previousState && previousState.lastUpdated !== issue.updated);

            // Generate field diffs
            const diffs: FieldDiff[] = [];
            const attachmentPromises: Promise<{ buffer: Buffer; filename: string } | null>[] = [];

            if (previousState && hasChanged) {
                if (issue.changelogItems && issue.changelogItems.length > 0) {
                    for (const item of issue.changelogItems) {
                        const fieldName = item.field || 'Unknown';

                        // Detect and download attachments
                        if (fieldName.toLowerCase() === 'attachment' && item.toString) {
                            // Extract URL or identifier if present in the 'to' field string?
                            // Jira usually puts the filename in `toString` and ID in `to`
                            if (item.to) {
                                // To download attachment we need /rest/api/2/attachment/{id} or the generated URL
                                // Actually, typically you hit the secure attachment content URL which requires hitting the attachment API
                                // The /secure/attachment link needs to be grabbed. We can assume the URL is [jiraHost]/secure/attachment/[id]/[filename]
                                const attachmentId = item.to;
                                const attachmentUrl = `${user.jiraHost.replace(/\/+$/, '')}/secure/attachment/${attachmentId}/${encodeURIComponent(item.toString)}`;
                                attachmentPromises.push(jiraClient.downloadAttachment(attachmentUrl));
                            }
                        }

                        diffs.push({
                            field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
                            oldValue: item.fromString || item.from || 'None',
                            newValue: item.toString || item.to || 'None',
                        });
                    }
                } else {
                    // Fallback comparison for issues without a changelog payload in this fetch
                    if (previousState.status !== issue.status) {
                        diffs.push({ field: 'Status', oldValue: previousState.status, newValue: issue.status });
                    }
                    if (previousState.assignee !== (issue.assignee || null)) {
                        diffs.push({ field: 'Assignee', oldValue: previousState.assignee || 'Unassigned', newValue: issue.assignee || 'Unassigned' });
                    }
                }

                if (issue.comments && issue.comments.length > 0) {
                    const prevLastUpdated = new Date(previousState.lastUpdated).getTime();
                    for (const comment of issue.comments) {
                        const commentCreated = new Date(comment.created).getTime();
                        if (commentCreated > prevLastUpdated) {
                            diffs.push({
                                field: 'Comment',
                                oldValue: 'None',
                                newValue: `[${comment.author}] ${comment.body}`
                            });
                        }
                    }
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

            if (hasChanged || isNewTask) {
                // Determine if we should ignore this change as a self-action. 
                // Only ignore self-actions on EXISTING tasks changing, NOT on brand new tasks.
                if (hasChanged && previousState) {
                    const isSelfAction = (issue.lastUpdaterEmail && issue.lastUpdaterEmail === user.jiraEmail) ||
                        (issue.lastUpdaterName && issue.lastUpdaterName === user.jiraEmail);

                    if (isSelfAction) {
                        console.log(`[Monitor] User ${chatId}: Ignored self-action change on ${issue.key}.`);
                        pendingChanges.delete(issue.key);
                        continue;
                    }
                }

                if (isNewTask) {
                    if (issue.description) {
                        diffs.push({
                            field: 'Description',
                            oldValue: 'None',
                            newValue: issue.description
                        });
                    }

                    if (issue.allPopulatedFields && issue.allPopulatedFields.length > 0) {
                        for (const field of issue.allPopulatedFields) {
                            diffs.push({
                                field: field.name,
                                oldValue: 'None',
                                newValue: field.value
                            });
                        }
                    }

                    if (issue.attachments && issue.attachments.length > 0) {
                        for (const att of issue.attachments) {
                            const attachmentUrl = `${user.jiraHost.replace(/\/+$/, '')}/secure/attachment/${att.id}/${encodeURIComponent(att.filename)}`;
                            attachmentPromises.push(jiraClient.downloadAttachment(attachmentUrl));
                        }
                    }
                }

                // Wait for all attachments to resolve
                const downloadedAttachments = (await Promise.all(attachmentPromises)).filter(a => a !== null) as { filename: string; buffer: Buffer }[];

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

                    if (downloadedAttachments.length > 0) {
                        pending.attachments = pending.attachments ? pending.attachments.concat(downloadedAttachments) : downloadedAttachments;
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
                        diffs: diffs,
                        firstDetectedAt: now,
                        lastChangeTime: now,
                        isNew: !previousState,
                        attachments: downloadedAttachments.length > 0 ? downloadedAttachments : undefined,
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
                if (filteredDiffs.length > 0 || pending.isNew) {
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
                userTimezone: prefs.schedule.timezone,
                isNew: pending.isNew,
                attachments: pending.attachments,
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
