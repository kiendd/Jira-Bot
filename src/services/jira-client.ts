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
    comments?: { author: string; body: string; created: string }[];
    description?: string;
    attachments?: { id: string; filename: string }[];
    allPopulatedFields?: { name: string; value: string }[];
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
     * Get all accessible projects.
     */
    async getAllProjects(): Promise<{ key: string; name: string }[]> {
        try {
            // jira.js version 2 Projects interface is problematic for fetching all projects.
            // Using the underlying axios instance to make a direct REST API call.
            const response = await (this.client as any).sendRequest({
                url: '/rest/api/2/project',
                method: 'GET'
            });
            const projects = response || [];
            return projects.map((p: any) => ({
                key: p.key,
                name: p.name
            }));
        } catch (error) {
            console.error('[JiraClient] Failed to fetch projects:', (error as Error).message);
            return [];
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
                fields: ['*all'], // Fetch all fields for dynamic extraction
                expand: ['changelog', 'names'], // 'names' maps customfield_XYZ to its display name
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

                const rawComments = (issue.fields as any)?.comment?.comments || [];
                const finalComments = rawComments.map((c: any) => ({
                    author: c.author?.displayName || c.author?.emailAddress || 'Unknown',
                    body: c.body,
                    created: c.created
                }));

                const rawAttachments = (issue.fields as any)?.attachment || [];
                const finalAttachments = rawAttachments.map((a: any) => ({
                    id: a.id.toString(),
                    filename: a.filename
                }));

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
                    description: (issue.fields as any)?.description || undefined,
                    attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
                    allPopulatedFields: this.extractAllPopulatedFields(issue.fields, response.names || {}),
                });
            }

            startAt += issues.length;
            if (issues.length < maxResults) break;
        }

        return allIssues;
    }

    /**
     * Extracts non-technical populated fields from an issue's raw fields.
     */
    private extractAllPopulatedFields(fields: any, namesMap: { [key: string]: string }): { name: string; value: string }[] {
        const result: { name: string; value: string }[] = [];
        if (!fields) return result;

        // Blocklist of technical/noisy/already-handled fields
        const blocklist = new Set([
            'worklog', 'watches', 'votes', 'progress', 'aggregateprogress', 'timetracking',
            'customfield_10000', // Development (huge JSON)
            'lastViewed', 'updated', 'created', 'resolutiondate',
            'status', 'summary', 'assignee', 'Attachment', 'comment',
            'project', 'issuetype', 'reporter', 'creator',
            'issuelinks', 'subtasks'
        ]);

        for (const [key, value] of Object.entries(fields)) {
            if (value == null || value === '' || blocklist.has(key)) continue;

            const name = namesMap[key] || key;
            if (blocklist.has(name) || name === 'Attachment' || name === 'Description') continue;

            let stringValue = '';

            if (typeof value === 'string') {
                stringValue = value;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                stringValue = String(value);
            } else if (Array.isArray(value)) {
                if (value.length === 0) continue;
                // Try to extract .name or .value from objects in array (e.g., Components, Labels, Fix versions)
                const items = value.map(v => {
                    if (typeof v === 'string') return v;
                    if (v && typeof v === 'object') {
                        return v.displayName || v.name || v.value || JSON.stringify(v);
                    }
                    return String(v);
                });
                stringValue = items.join(', ');
            } else if (typeof value === 'object') {
                // Object (e.g., Priority, Resolution, Custom object)
                stringValue = (value as any).displayName || (value as any).name || (value as any).value;
                if (!stringValue) continue; // Skip complex objects without a clear name
            }

            if (stringValue.trim()) {
                result.push({ name, value: stringValue.trim() });
            }
        }

        return result;
    }

    /**
     * Download an attachment securely from Jira using the stored credentials.
     */
    async downloadAttachment(url: string): Promise<{ buffer: Buffer; filename: string } | null> {
        try {
            // Reconstruct the auth header based on client configuration
            // `this.client` is a bit opaque, so we'll construct the fetch manually using the underlying credentials
            const authConfig = (this.client as any).config?.authentication;
            let authHeader = '';

            if (authConfig?.basic) {
                const creds = `${authConfig.basic.email}:${authConfig.basic.apiToken}`;
                authHeader = `Basic ${Buffer.from(creds).toString('base64')}`;
            } else if (authConfig?.personalAccessToken) {
                authHeader = `Bearer ${authConfig.personalAccessToken}`;
            }

            const response = await fetch(url, {
                headers: authHeader ? { Authorization: authHeader } : undefined
            });

            if (!response.ok) {
                console.error(`[JiraClient] Failed to download attachment: ${response.status} ${response.statusText}`);
                return null;
            }

            const buffer = await response.arrayBuffer();

            // Try to guess filename from URL or header
            let filename = url.split('/').pop()?.split('?')[0] || 'attachment';
            const disp = response.headers.get('content-disposition');
            if (disp && disp.includes('filename=')) {
                const match = disp.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            return { buffer: Buffer.from(buffer), filename };
        } catch (error) {
            console.error('[JiraClient] Error downloading attachment:', (error as Error).message);
            return null;
        }
    }

    /**
     * Get the current user's Account ID (used for assignment in Jira Cloud).
     */
    async getCurrentUserAccountId(): Promise<string | null> {
        try {
            const user = await this.client.myself.getCurrentUser();
            return user.accountId || null;
        } catch (error) {
            console.error('[JiraClient] Failed to get current user:', (error as Error).message);
            return null;
        }
    }

    /**
     * Add a comment to an issue.
     */
    async addComment(issueKey: string, body: string): Promise<boolean> {
        try {
            await this.client.issueComments.addComment({
                issueIdOrKey: issueKey,
                comment: body
            });
            return true;
        } catch (error) {
            console.error(`[JiraClient] Failed to add comment to ${issueKey}:`, (error as Error).message);
            return false;
        }
    }

    /**
     * Assign an issue to a user account ID.
     */
    async assignIssue(issueKey: string, accountId: string): Promise<boolean> {
        try {
            await this.client.issues.assignIssue({
                issueIdOrKey: issueKey,
                accountId: accountId
            });
            return true;
        } catch (error) {
            console.error(`[JiraClient] Failed to assign ${issueKey}:`, (error as Error).message);
            return false;
        }
    }

    /**
     * Get available transitions for an issue.
     */
    async getTransitions(issueKey: string): Promise<{ id: string; name: string }[]> {
        try {
            const result = await this.client.issues.getTransitions({
                issueIdOrKey: issueKey
            });
            return (result.transitions || []).map(t => ({
                id: t.id!,
                name: t.name!
            }));
        } catch (error) {
            console.error(`[JiraClient] Failed to get transitions for ${issueKey}:`, (error as Error).message);
            return [];
        }
    }

    /**
     * Execute a status transition on an issue.
     */
    async transitionIssue(issueKey: string, transitionId: string): Promise<boolean> {
        try {
            await this.client.issues.doTransition({
                issueIdOrKey: issueKey,
                transition: {
                    id: transitionId
                }
            });
            return true;
        } catch (error) {
            console.error(`[JiraClient] Failed to transition ${issueKey}:`, (error as Error).message);
            return false;
        }
    }
}
