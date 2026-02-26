import { Version2Client } from 'jira.js';

export interface JiraIssue {
    key: string;
    summary: string;
    status: string;
    assignee: string | null;
    updated: string;
}

export class JiraClient {
    private client: Version2Client;

    constructor(host: string, email: string, apiToken: string) {
        // Remove trailing slashes from host
        const cleanHost = host.replace(/\/+$/, '');
        const isCloud = cleanHost.includes('.atlassian.net');

        let authentication: any;
        if (isCloud) {
            authentication = { basic: { email, apiToken } };
        } else {
            // Jira Server/Data Center uses Personal Access Tokens
            authentication = { personalAccessToken: apiToken };
        }

        this.client = new Version2Client({
            host: cleanHost,
            authentication,
        });
    }

    /**
     * Verify credentials by calling the /myself endpoint.
     */
    async verifyCredentials(): Promise<boolean> {
        try {
            await this.client.myself.getCurrentUser();
            return true;
        } catch (error) {
            console.error('[JiraClient] Authentication failed:', (error as Error).message);
            return false;
        }
    }

    /**
     * Search issues using JQL. Handles pagination automatically.
     */
    async searchIssues(jql: string): Promise<JiraIssue[]> {
        const allIssues: JiraIssue[] = [];
        let startAt = 0;
        const maxResults = 50;

        while (true) {
            const response = await this.client.issueSearch.searchForIssuesUsingJql({
                jql,
                startAt,
                maxResults,
                fields: ['updated', 'summary', 'status', 'assignee'],
            });

            const issues = response.issues || [];
            if (issues.length === 0) break;

            for (const issue of issues) {
                allIssues.push({
                    key: issue.key,
                    summary: issue.fields?.summary || '(no summary)',
                    status:
                        (issue.fields as any)?.status?.name || 'Unknown',
                    assignee:
                        (issue.fields as any)?.assignee?.displayName || null,
                    updated: issue.fields?.updated || '',
                });
            }

            startAt += issues.length;
            if (issues.length < maxResults) break;
        }

        return allIssues;
    }
}
