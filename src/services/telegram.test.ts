import { describe, it, expect } from 'vitest';
import { buildJql, TelegramNotifier } from './telegram';
import { NotificationPayload } from './notifier';

describe('buildJql', () => {
    it('should return default JQL when no scopes are active', () => {
        expect(buildJql({ assigned: false, created: false, participated: false, watched: false })).toBe('updated > -1d');
    });

    it('should build JQL for assigned and created issues', () => {
        expect(buildJql({ assigned: true, created: true, participated: false, watched: false }))
            .toBe('(assignee = currentUser() OR reporter = currentUser()) AND updated > -1d');
    });

    it('should combine all scopes with OR', () => {
        const scopes = { assigned: true, created: true, participated: true, watched: true };
        const jql = buildJql(scopes, 'test@example.com');
        expect(jql).toBe('(assignee = currentUser() OR reporter = currentUser() OR issue in updatedBy("test@example.com") OR issue in watchedIssues()) AND updated > -1d');
    });
});

describe('TelegramNotifier Message Formatting', () => {
    it('should format a new issue differently than an updated issue', () => {
        const notifier = new TelegramNotifier('dummy_token');

        const basePayload: NotificationPayload = {
            host: 'https://jira.example.com',
            issueKey: 'TEST-123',
            summary: 'A new test issue',
            status: 'To Do',
            assignee: 'John Doe',
            diffs: [],
            detectedAt: new Date('2026-02-26T10:00:00Z'),
            stabilizedAt: new Date('2026-02-26T10:05:00Z'),
            userTimezone: 'UTC'
        };

        const newIssuePayload = { ...basePayload, isNew: true };
        const updatedIssuePayload = { ...basePayload, isNew: false };

        // Access private method for testing
        const formatMessage = (notifier as any).formatMessage.bind(notifier);

        const newMessageStr = formatMessage(newIssuePayload);
        const updatedMessageStr = formatMessage(updatedIssuePayload);

        // New issues should have the sparkle icon and "New Issue:" prefix
        expect(newMessageStr[0]).toContain('✨ <b>New Issue:');
        expect(newMessageStr[0]).toContain('TEST-123');

        // Updated issues should have the bell icon
        expect(updatedMessageStr[0]).toContain('🔔 <b><a href=');
        expect(updatedMessageStr[0]).not.toContain('✨ <b>New Issue:');
    });

    it('should split messages longer than 4000 characters into chunks', () => {
        const notifier = new TelegramNotifier('dummy_token');

        // Create a massive payload, ensuring chunk splitting logic runs
        const longComment = 'A'.repeat(5000);
        const basePayload: NotificationPayload = {
            host: 'https://jira.example.com',
            issueKey: 'TEST-999',
            summary: 'Huge update',
            status: 'To Do',
            assignee: 'John Doe',
            diffs: [
                { field: 'Comment', oldValue: 'None', newValue: longComment }
            ],
            detectedAt: new Date(),
            stabilizedAt: new Date(),
            userTimezone: 'UTC'
        };

        const formatMessage = (notifier as any).formatMessage.bind(notifier);
        const chunks = formatMessage(basePayload);

        // Entire message should be >5000 chars, so >1 chunk.
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0].length).toBeLessThanOrEqual(4000);
        expect(chunks[1].length).toBeLessThanOrEqual(4000);
        expect(chunks[0]).toContain('TEST-999');
        // Check that 'A' repeats extensively
        const combined = chunks.join('');
        expect(combined).toContain('AAAA');
    });
});
