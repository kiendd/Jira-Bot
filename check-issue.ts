import { JiraClient } from './src/services/jira-client';
import mongoose from 'mongoose';
import { User } from './src/models/user';
import { decrypt } from './src/services/encryption';
import dotenv from 'dotenv';
import { IssueState } from './src/models/issue-state';

dotenv.config();

async function checkIssue() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jira-bot');

    const user = await User.findOne({ isActive: true });
    if (!user) process.exit(1);

    const client = new JiraClient(user.jiraHost, user.jiraEmail, process.env.ENCRYPTION_KEY ? decrypt(user.jiraApiToken, process.env.ENCRYPTION_KEY) : user.jiraApiToken);

    console.log(`Checking issue DC5FC-2159...`);
    try {
        const jql = 'issue = "DC5FC-2159"';
        const issues = await client.searchIssues(jql);

        if (issues.length > 0) {
            const issue = issues[0];
            const previousState = await IssueState.findOne({ chatId: user.chatId, issueKey: issue.key });

            console.log(`Found issue in Jira:`);
            console.log(`- Previous State in DB: ${previousState ? 'EXISTS' : 'NOT FOUND'}`);

            if (previousState) {
                console.log(`- DB Updated: ${previousState.lastUpdated}`);
                console.log(`- Jira Updated: ${issue.updated}`);
                console.log(`- Has Changed: ${previousState.lastUpdated !== issue.updated}`);
            }
        }
    } catch (error: any) {
        console.error(`Failed to fetch issue:`, error.message);
    }

    process.exit(0);
}

checkIssue();
