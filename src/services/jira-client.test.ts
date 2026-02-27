import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraClient } from './jira-client';

// Mock jira.js
vi.mock('jira.js', () => {
    return {
        Version2Client: class {
            public myself: any;
            public issueComments: any;
            public issues: any;

            constructor() {
                this.myself = {
                    getCurrentUser: vi.fn()
                };
                this.issueComments = {
                    addComment: vi.fn()
                };
                this.issues = {
                    assignIssue: vi.fn(),
                    getTransitions: vi.fn(),
                    doTransition: vi.fn()
                };
            }
        }
    };
});

describe('JiraClient', () => {
    let client: JiraClient;
    let mockJiraJsClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new JiraClient('https://test.atlassian.net', 'test@example.com', 'token');
        mockJiraJsClient = (client as any).client;
    });

    describe('getCurrentUserAccountId', () => {
        it('should return accountId on success', async () => {
            mockJiraJsClient.myself.getCurrentUser.mockResolvedValue({ accountId: 'account-123' });

            const result = await client.getCurrentUserAccountId();

            expect(result).toBe('account-123');
            expect(mockJiraJsClient.myself.getCurrentUser).toHaveBeenCalled();
        });

        it('should return null on failure', async () => {
            mockJiraJsClient.myself.getCurrentUser.mockRejectedValue(new Error('API Error'));

            const result = await client.getCurrentUserAccountId();

            expect(result).toBeNull();
        });
    });

    describe('addComment', () => {
        it('should return true on success', async () => {
            mockJiraJsClient.issueComments.addComment.mockResolvedValue({});

            const result = await client.addComment('TEST-1', 'Hello world');

            expect(result).toBe(true);
            expect(mockJiraJsClient.issueComments.addComment).toHaveBeenCalledWith({
                issueIdOrKey: 'TEST-1',
                body: 'Hello world'
            });
        });

        it('should return false on failure', async () => {
            mockJiraJsClient.issueComments.addComment.mockRejectedValue(new Error('API Error'));

            const result = await client.addComment('TEST-1', 'Hello world');

            expect(result).toBe(false);
        });
    });

    describe('assignIssue', () => {
        it('should return true on success', async () => {
            mockJiraJsClient.issues.assignIssue.mockResolvedValue({});

            const result = await client.assignIssue('TEST-1', 'account-123');

            expect(result).toBe(true);
            expect(mockJiraJsClient.issues.assignIssue).toHaveBeenCalledWith({
                issueIdOrKey: 'TEST-1',
                accountId: 'account-123'
            });
        });

        it('should return false on failure', async () => {
            mockJiraJsClient.issues.assignIssue.mockRejectedValue(new Error('API Error'));

            const result = await client.assignIssue('TEST-1', 'account-123');

            expect(result).toBe(false);
        });
    });

    describe('getTransitions', () => {
        it('should return array of transitions', async () => {
            mockJiraJsClient.issues.getTransitions.mockResolvedValue({
                transitions: [
                    { id: '11', name: 'In Progress' },
                    { id: '21', name: 'Done' }
                ]
            });

            const result = await client.getTransitions('TEST-1');

            expect(result).toEqual([
                { id: '11', name: 'In Progress' },
                { id: '21', name: 'Done' }
            ]);
            expect(mockJiraJsClient.issues.getTransitions).toHaveBeenCalledWith({
                issueIdOrKey: 'TEST-1'
            });
        });

        it('should return empty array on failure', async () => {
            mockJiraJsClient.issues.getTransitions.mockRejectedValue(new Error('API Error'));

            const result = await client.getTransitions('TEST-1');

            expect(result).toEqual([]);
        });
    });

    describe('transitionIssue', () => {
        it('should return true on success', async () => {
            mockJiraJsClient.issues.doTransition.mockResolvedValue({});

            const result = await client.transitionIssue('TEST-1', '11');

            expect(result).toBe(true);
            expect(mockJiraJsClient.issues.doTransition).toHaveBeenCalledWith({
                issueIdOrKey: 'TEST-1',
                transition: { id: '11' }
            });
        });

        it('should return false on failure', async () => {
            mockJiraJsClient.issues.doTransition.mockRejectedValue(new Error('API Error'));

            const result = await client.transitionIssue('TEST-1', '11');

            expect(result).toBe(false);
        });
    });
});
