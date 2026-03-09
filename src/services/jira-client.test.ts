import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraClient } from './jira-client';

describe('JiraClient', () => {
    let jiraClient: JiraClient;

    beforeEach(() => {
        vi.clearAllMocks();
        jiraClient = new JiraClient('https://test.atlassian.net', 'test@test.com', 'token');
    });

    describe('extractAllPopulatedFields', () => {
        it('should extract non-technical populated fields and their names', () => {
            const mockFields = {
                customfield_10110: '2026-03-04',
                customfield_10107: { displayName: 'Team A' }, // object with displayName
                priority: { name: 'High' }, // object with name
                labels: ['frontend', 'bug'], // array of strings
                environment: [{ name: 'Staging' }], // array of objects
                emptyString: '', // should be ignored
                nullValue: null, // should be ignored
                worklog: { total: 0 }, // in blocklist, should be ignored
                watches: { watchCount: 1 }, // in blocklist, should be ignored
                project: { key: 'TEST' }, // in blocklist, should be ignored
                description: 'This is a description', // explicitly skipped as it's handled separately
            };

            const mockNamesMap = {
                customfield_10110: 'Target end',
                customfield_10107: 'Team',
                priority: 'Priority',
                labels: 'Labels',
                environment: 'Environment',
                emptyString: 'Empty',
                nullValue: 'Null',
                worklog: 'Log Work',
                watches: 'Watchers',
                project: 'Project',
                description: 'Description'
            };

            const result = (jiraClient as any).extractAllPopulatedFields(mockFields, mockNamesMap);

            expect(result).toHaveLength(5);

            expect(result).toContainEqual({ name: 'Target end', value: '2026-03-04' });
            expect(result).toContainEqual({ name: 'Team', value: 'Team A' });
            expect(result).toContainEqual({ name: 'Priority', value: 'High' });
            expect(result).toContainEqual({ name: 'Labels', value: 'frontend, bug' });
            expect(result).toContainEqual({ name: 'Environment', value: 'Staging' });

            // Ensure blocked/empty fields are not present
            const extractedNames = result.map((r: any) => r.name);
            expect(extractedNames).not.toContain('Empty');
            expect(extractedNames).not.toContain('Null');
            expect(extractedNames).not.toContain('Log Work');
            expect(extractedNames).not.toContain('Watchers');
            expect(extractedNames).not.toContain('Project');
            expect(extractedNames).not.toContain('Description');
            expect(extractedNames).not.toContain('Component/s');
        });

        it('should filter out noisy system fields', () => {
            const mockFields = {
                rank: '1234',
                'work ratio': 10,
                sprint: [{ id: 1, name: 'Sprint 1' }],
                'epic link': 'PROJ-123',
                components: [{ name: 'Backend' }],
                'component/s': 'Backend',
                summary: 'Task summary', // Should be blocked by default blocklist
                customfield_123: 'Valid field'
            };

            const mockNamesMap = {
                rank: 'Rank',
                'work ratio': 'Work Ratio',
                sprint: 'Sprint',
                'epic link': 'Epic Link',
                components: 'Components',
                'component/s': 'Component/s',
                summary: 'Summary',
                customfield_123: 'Custom Field'
            };

            const result = (jiraClient as any).extractAllPopulatedFields(mockFields, mockNamesMap);

            expect(result).toHaveLength(1);
            expect(result).toContainEqual({ name: 'Custom Field', value: 'Valid field' });

            const extractedNames = result.map((r: any) => r.name);
            expect(extractedNames).not.toContain('Rank');
            expect(extractedNames).not.toContain('Work Ratio');
            expect(extractedNames).not.toContain('Sprint');
            expect(extractedNames).not.toContain('Epic Link');
            expect(extractedNames).not.toContain('Components');
            expect(extractedNames).not.toContain('Component/s');
        });
    });

    describe('caching', () => {
        it('should return cached projects on second call', async () => {
            const mockProjects = [{ key: 'TEST', name: 'Test Project' }];
            // Mock the underlying axios sendRequest
            (jiraClient as any).client = {
                config: { host: 'https://test.atlassian.net', authentication: { basic: { email: 'test@test.com' } } },
                sendRequest: vi.fn().mockResolvedValue(mockProjects)
            };

            // First call should hit the "API"
            const result1 = await jiraClient.getAllProjects();
            expect(result1).toEqual(mockProjects);
            expect((jiraClient as any).client.sendRequest).toHaveBeenCalledTimes(1);

            // Second call should return from cache
            const result2 = await jiraClient.getAllProjects();
            expect(result2).toEqual(mockProjects);
            expect((jiraClient as any).client.sendRequest).toHaveBeenCalledTimes(1); // Still 1
        });
    });
});
