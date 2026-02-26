import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitorService } from './monitor';
import { User } from '../models/user';
import { IssueState } from '../models/issue-state';
import { JiraClient } from './jira-client';
import { Notifier } from './notifier';

vi.mock('../models/user');
vi.mock('../models/issue-state');
vi.mock('./jira-client');

describe('Self-Action Filtering in MonitorService', () => {
    let monitor: MonitorService;
    let mockNotifier: Notifier;

    beforeEach(() => {
        vi.clearAllMocks();
        mockNotifier = {
            notify: vi.fn(),
            notifyError: vi.fn(),
        } as any;
        monitor = new MonitorService(mockNotifier, 60000, 30000);
    });

    it('should ignore changes authored by the user', async () => {
        // Mock user
        const mockUser = {
            chatId: '123_self',
            jiraEmail: 'testuser@example.com',
            jiraApiToken: 'token',
            jql: 'test jql',
            isActive: true,
            save: vi.fn()
        };
        (User.find as any) = vi.fn().mockResolvedValue([mockUser]);

        // Mock an established baseline
        (monitor as any).initializedUsers.add('123_self');
        (monitor as any).pendingByUser.set('123_self', new Map());

        // Mock previously stored state
        (IssueState.find as any) = vi.fn().mockResolvedValue([
            { chatId: '123_self', issueKey: 'TEST-1', status: 'To Do', assignee: null, lastUpdated: '2023-01-01T00:00:00.000Z' }
        ]);

        // Mock IssueState update method
        (IssueState.findOneAndUpdate as any) = vi.fn().mockResolvedValue({});

        // Mock Jira return with Self-Action
        const mockIssue = {
            key: 'TEST-1',
            summary: 'Test issue',
            status: 'In Progress',
            assignee: null,
            updated: '2023-01-01T01:00:00.000Z',
            lastUpdaterEmail: 'testuser@example.com' // matches user.jiraEmail
        };
        (JiraClient.prototype.searchIssues as any) = vi.fn().mockResolvedValue([mockIssue]);

        // Act
        await (monitor as any).pollAllUsers();

        // Assert
        const pending = (monitor as any).pendingByUser.get('123_self');
        expect(pending.has('TEST-1')).toBe(false); // Should NOT add to pending because it is self-action
        expect(IssueState.findOneAndUpdate).toHaveBeenCalledWith(
            { chatId: '123_self', issueKey: 'TEST-1' },
            expect.objectContaining({ lastUpdated: '2023-01-01T01:00:00.000Z' }),
            expect.anything()
        );
    });

    it('should record changes authored by another user', async () => {
        const mockUser = {
            chatId: '123_other',
            jiraEmail: 'testuser@example.com',
            jiraApiToken: 'token',
            jql: 'test jql',
            isActive: true,
            save: vi.fn()
        };
        (User.find as any) = vi.fn().mockResolvedValue([mockUser]);

        (monitor as any).initializedUsers.add('123_other');
        (monitor as any).pendingByUser.set('123_other', new Map());

        (IssueState.find as any) = vi.fn().mockResolvedValue([
            { chatId: '123_other', issueKey: 'TEST-2', status: 'To Do', assignee: null, lastUpdated: '2023-01-01T00:00:00.000Z' }
        ]);
        (IssueState.findOneAndUpdate as any) = vi.fn().mockResolvedValue({});

        const mockIssue = {
            key: 'TEST-2',
            summary: 'Test issue',
            status: 'In Progress',
            assignee: null,
            updated: '2023-01-01T01:00:00.000Z',
            lastUpdaterEmail: 'anotheruser@example.com' // does NOT match user.jiraEmail
        };
        (JiraClient.prototype.searchIssues as any) = vi.fn().mockResolvedValue([mockIssue]);

        await (monitor as any).pollAllUsers();

        const pending = (monitor as any).pendingByUser.get('123_other');
        expect(pending.has('TEST-2')).toBe(true); // SHOULD add to pending
    });
});

describe('Changelog Field Diffs in MonitorService', () => {
    let monitor: MonitorService;
    let mockNotifier: Notifier;

    beforeEach(() => {
        vi.clearAllMocks();
        mockNotifier = {
            notify: vi.fn(),
            notifyError: vi.fn(),
        } as any;
        monitor = new MonitorService(mockNotifier, 60000, 30000);
    });

    it('should generate diffs from changelog items', async () => {
        const mockUser = {
            chatId: '123_changelog',
            jiraEmail: 'testuser@example.com',
            jiraApiToken: 'token',
            jql: 'test jql',
            isActive: true,
            preferences: {
                trackStatus: true,
                trackAssignee: true,
                schedule: { timezone: 'UTC', activeDays: [1, 2, 3, 4, 5], startTime: '00:00', endTime: '23:59' }
            },
            save: vi.fn()
        };
        (User.find as any) = vi.fn().mockResolvedValue([mockUser]);

        (monitor as any).initializedUsers.add('123_changelog');
        (monitor as any).pendingByUser.set('123_changelog', new Map());

        (IssueState.find as any) = vi.fn().mockResolvedValue([
            { chatId: '123_changelog', issueKey: 'TEST-3', status: 'To Do', assignee: null, lastUpdated: '2023-01-01T00:00:00.000Z' }
        ]);
        (IssueState.findOneAndUpdate as any) = vi.fn().mockResolvedValue({});

        const mockIssue = {
            key: 'TEST-3',
            summary: 'Test issue',
            status: 'To Do',
            assignee: null,
            updated: '2023-01-01T01:00:00.000Z',
            lastUpdaterEmail: 'anotheruser@example.com',
            changelogItems: [
                {
                    field: 'description',
                    fromString: 'Old description',
                    toString: 'New description'
                },
                {
                    field: 'comment',
                    fromString: null,
                    toString: 'Added a new comment'
                }
            ]
        };
        (JiraClient.prototype.searchIssues as any) = vi.fn().mockResolvedValue([mockIssue]);

        await (monitor as any).pollAllUsers();

        const pending = (monitor as any).pendingByUser.get('123_changelog');
        expect(pending.has('TEST-3')).toBe(true);
        const pendingChange = pending.get('TEST-3');

        expect(pendingChange.diffs.length).toBe(2);
        expect(pendingChange.diffs[0]).toEqual({
            field: 'Description',
            oldValue: 'Old description',
            newValue: 'New description',
        });
        expect(pendingChange.diffs[1]).toEqual({
            field: 'Comment',
            oldValue: 'None',
            newValue: 'Added a new comment',
        });
    });
});
