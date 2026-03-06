import { describe, it, expect, vi } from 'vitest';
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
        const jql = buildJql(scopes, [], 'test@example.com');
        expect(jql).toBe('(assignee = currentUser() OR reporter = currentUser() OR issue in updatedBy("test@example.com") OR issue in watchedIssues()) AND updated > -1d');
    });

    it('should include project scopes', () => {
        const scopes = { assigned: false, created: false, participated: false, watched: false };
        let jql = buildJql(scopes, ['PROJ1'], 'test@example.com');
        expect(jql).toBe('project in ("PROJ1") AND updated > -1d');

        jql = buildJql(scopes, ['PROJ1', 'PROJ2'], 'test@example.com');
        expect(jql).toBe('(project in ("PROJ1", "PROJ2")) AND updated > -1d');
    });

    it('should combine relationship and project scopes with OR', () => {
        const scopes = { assigned: true, created: false, participated: false, watched: false };
        const jql = buildJql(scopes, ['PROJ1'], 'test@example.com');
        expect(jql).toBe('((assignee = currentUser()) OR project in ("PROJ1")) AND updated > -1d');
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

        // New issues should have the sparkle icon and "New Task:" prefix
        expect(newMessageStr[0]).toContain('✨ <b>New Task:');
        expect(newMessageStr[0]).toContain('TEST-123');

        // Updated issues should have the bell icon
        expect(updatedMessageStr[0]).toContain('🔔 <b><a href=');
        expect(updatedMessageStr[0]).not.toContain('✨ <b>New Task:');
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

    it('should add inline keyboard to the last message chunk', async () => {
        const notifier = new TelegramNotifier('dummy_token');
        const botMock = {
            sendMessage: vi.fn().mockResolvedValue({}),
            on: vi.fn(),
            onText: vi.fn()
        };
        (notifier as any).bot = botMock;

        const payload: NotificationPayload = {
            host: 'https://jira.example.com',
            issueKey: 'TEST-123',
            summary: 'A test issue',
            status: 'To Do',
            assignee: 'John Doe',
            diffs: [],
            detectedAt: new Date(),
            stabilizedAt: new Date(),
            userTimezone: 'UTC'
        };

        await notifier.notify(payload, '12345');

        expect(botMock.sendMessage).toHaveBeenCalledTimes(1);
        const callArgs = botMock.sendMessage.mock.calls[0];
        expect(callArgs[0]).toBe('12345'); // chatId
        expect(callArgs[2].reply_markup.inline_keyboard).toBeDefined();

        const keyboard = callArgs[2].reply_markup.inline_keyboard;
        expect(keyboard[0][0].callback_data).toBe('comment_TEST-123');
        expect(keyboard[0][1].callback_data).toBe('assign_TEST-123');
        expect(keyboard[1][0].callback_data).toBe('transition_TEST-123');
    });
});

describe('TelegramNotifier Attachment Grouping', () => {
    it('should group multiple photos into a media group', async () => {
        const notifier = new TelegramNotifier('dummy_token');
        const botMock = {
            sendMessage: vi.fn(),
            sendMediaGroup: vi.fn().mockResolvedValue({}),
            sendDocument: vi.fn(),
            sendPhoto: vi.fn(),
            on: vi.fn(),
            onText: vi.fn()
        };
        (notifier as any).bot = botMock;

        const payload: NotificationPayload = {
            host: 'https://jira.example.com',
            issueKey: 'TEST-124',
            summary: 'Test grouping',
            status: 'To Do',
            assignee: 'John Doe',
            diffs: [],
            detectedAt: new Date(),
            stabilizedAt: new Date(),
            userTimezone: 'UTC',
            attachments: [
                { filename: 'image1.jpg', buffer: Buffer.from('img1') },
                { filename: 'IMG_2024.PNG', buffer: Buffer.from('img2') },
                { filename: 'doc.pdf', buffer: Buffer.from('pdf') },
            ]
        };

        await notifier.notify(payload, '12345');

        expect(botMock.sendMediaGroup).toHaveBeenCalledTimes(1);
        const mediaGroupArgs = botMock.sendMediaGroup.mock.calls[0];
        expect(mediaGroupArgs[0]).toBe('12345'); // chatId
        expect(mediaGroupArgs[1]).toHaveLength(2); // 2 photos grouped
        expect(mediaGroupArgs[1][0].type).toBe('photo');
        expect(mediaGroupArgs[1][1].type).toBe('photo');

        expect(botMock.sendDocument).toHaveBeenCalledTimes(1);
        const docArgs = botMock.sendDocument.mock.calls[0];
        expect(docArgs[3].filename).toBe('doc.pdf'); // the pdf sent separately

        expect(botMock.sendPhoto).not.toHaveBeenCalled();
    });

    it('should send a single photo individually without grouping', async () => {
        const notifier = new TelegramNotifier('dummy_token');
        const botMock = {
            sendMessage: vi.fn(),
            sendMediaGroup: vi.fn(),
            sendDocument: vi.fn(),
            sendPhoto: vi.fn().mockResolvedValue({}),
            on: vi.fn(),
            onText: vi.fn()
        };
        (notifier as any).bot = botMock;

        const payload: NotificationPayload = {
            host: 'https://jira.example.com',
            issueKey: 'TEST-125',
            summary: 'Test single photo',
            status: 'To Do',
            assignee: 'John',
            diffs: [],
            detectedAt: new Date(),
            stabilizedAt: new Date(),
            userTimezone: 'UTC',
            attachments: [
                { filename: 'alone.jpg', buffer: Buffer.from('alone') }
            ]
        };

        await notifier.notify(payload, '12345');

        expect(botMock.sendMediaGroup).not.toHaveBeenCalled();
        expect(botMock.sendPhoto).toHaveBeenCalledTimes(1);
        expect(botMock.sendPhoto.mock.calls[0][3].filename).toBe('alone.jpg');
    });
});
