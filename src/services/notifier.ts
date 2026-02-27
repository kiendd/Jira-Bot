export interface FieldDiff {
    field: string;
    oldValue: string;
    newValue: string;
}

export interface NotificationPayload {
    host: string;
    issueKey: string;
    summary: string;
    status: string;
    assignee: string | null;
    diffs: FieldDiff[];
    detectedAt: Date;
    stabilizedAt: Date;
    userTimezone?: string;
    isNew?: boolean;
    attachments?: { filename: string; buffer: Buffer }[];
}

export interface Notifier {
    /**
     * Send a notification.
     * @param payload - The notification data.
     * @param chatId - The target user's chat ID (used by TelegramNotifier).
     */
    notify(payload: NotificationPayload, chatId?: string): Promise<void>;

    /**
     * Send an error alert to the user.
     */
    notifyError?(message: string, chatId?: string): Promise<void>;
}

/**
 * Console-based notifier (for development/testing).
 */
export class ConsoleNotifier implements Notifier {
    async notify(payload: NotificationPayload, chatId?: string): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`\n========================================`);
        console.log(`[NOTIFICATION] ${timestamp} (User: ${chatId || 'N/A'})`);
        console.log(`  Issue:    ${payload.host}/browse/${payload.issueKey}`);
        console.log(`  Summary:  ${payload.summary}`);
        console.log(`  Status:   ${payload.status}`);
        console.log(`  Assignee: ${payload.assignee || 'Unassigned'}`);
        if (payload.diffs && payload.diffs.length > 0) {
            console.log(`  Changes:`);
            for (const diff of payload.diffs) {
                console.log(`    - ${diff.field}: ${diff.oldValue} -> ${diff.newValue}`);
            }
        }
        console.log(`  Detected: ${payload.detectedAt.toISOString()}`);
        console.log(`  Stable:   ${payload.stabilizedAt.toISOString()}`);
        console.log(`========================================\n`);
    }
}
