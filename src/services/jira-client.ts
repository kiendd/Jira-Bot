import { Version2Client } from 'jira.js';

export interface JiraChangelogItem {
    field?: string;
    fieldtype?: string;
    fieldId?: string;
    from?: string | null;
    fromString?: string | null;
    to?: string | null;
    toString?: string | null;
}

export interface JiraIssue {
    key: string;
    summary: string;
    status: string;
    assignee: string | null;
    updated: string;
    lastUpdaterEmail?: string;
    lastUpdaterName?: string;
    changelogItems?: JiraChangelogItem[];
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
                fields: ['updated', 'summary', 'status', 'assignee', 'creator', 'reporter'],
                expand: ['changelog'],
            });

            const issues = response.issues || [];
            if (issues.length === 0) break;

            for (const issue of issues) {
                let lastUpdaterEmail: string | undefined = undefined;
                let lastUpdaterName: string | undefined = undefined;

                let recentChangelogItems: JiraChangelogItem[] = [];

                if (issue.changelog && issue.changelog.histories && issue.changelog.histories.length > 0) {
                    const sortedHistories = [...issue.changelog.histories].sort(
                        (a: any, b: any) => new Date(a.created || 0).getTime() - new Date(b.created || 0).getTime()
                    );
                    const latestHistory = sortedHistories[sortedHistories.length - 1];
                    lastUpdaterEmail = (latestHistory.author as any)?.emailAddress;
                    lastUpdaterName = latestHistory.author?.displayName;

                    if (latestHistory.items) {
                        recentChangelogItems = latestHistory.items.map((i: any) => ({
                            field: i.field,
                            fieldtype: i.fieldtype,
                            fieldId: i.fieldId,
                            from: i.from,
                            fromString: i.fromString,
                            to: i.to,
                            toString: i.toString,
                        }));
                    }
                } else {
                    // Fallback for new issues without history
                    const userObj = (issue.fields as any)?.creator || (issue.fields as any)?.reporter;
                    if (userObj) {
                        lastUpdaterEmail = userObj.emailAddress;
                        lastUpdaterName = userObj.displayName;
                    }
                }

                allIssues.push({
                    key: issue.key,
                    summary: issue.fields?.summary || '(no summary)',
                    status:
                        (issue.fields as any)?.status?.name || 'Unknown',
                    assignee:
                        (issue.fields as any)?.assignee?.displayName || null,
                    updated: issue.fields?.updated || '',
                    lastUpdaterEmail,
                    lastUpdaterName,
                    changelogItems: recentChangelogItems,
                });
            }

            startAt += issues.length;
            if (issues.length < maxResults) break;
        }

        return allIssues;
    }
}
