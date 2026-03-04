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
                components: [{ name: 'UI' }, { name: 'Backend' }], // array of objects
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
                components: 'Component/s',
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
            expect(result).toContainEqual({ name: 'Component/s', value: 'UI, Backend' });

            // Ensure blocked/empty fields are not present
            const extractedNames = result.map((r: any) => r.name);
            expect(extractedNames).not.toContain('Empty');
            expect(extractedNames).not.toContain('Null');
            expect(extractedNames).not.toContain('Log Work');
            expect(extractedNames).not.toContain('Watchers');
            expect(extractedNames).not.toContain('Project');
            expect(extractedNames).not.toContain('Description');
        });
    });
});
