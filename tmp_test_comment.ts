import { JiraClient } from '/Users/kien/Workspace/FPT/Tools/Jira-bot/src/services/jira-client';
import mongoose from 'mongoose';
import { User } from '/Users/kien/Workspace/FPT/Tools/Jira-bot/src/models/user';
import { decrypt } from '/Users/kien/Workspace/FPT/Tools/Jira-bot/src/services/encryption';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/kien/Workspace/FPT/Tools/Jira-bot/.env' });

async function testJira() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jira-bot');
    const user = await User.findOne({ isActive: true });
    if (!user) process.exit(1);

    const rawToken = process.env.ENCRYPTION_KEY ? decrypt(user.jiraApiToken, process.env.ENCRYPTION_KEY) : user.jiraApiToken;
    const client = new JiraClient(user.jiraHost, user.jiraEmail, rawToken);

    const issues = await client.searchIssues('issue = "DC5FC-2206"');

    console.log(JSON.stringify(issues[0], null, 2));

    // Also get the raw response from Version2Client to see "comment" field if it exists
    const rawIssues = await (client as any).client.issueSearch.searchForIssuesUsingJql({
        jql: 'issue = "DC5FC-2206"',
        fields: ['updated', 'summary', 'status', 'assignee', 'comment'],
        expand: ['changelog'],
    });
    console.log("\n--- RAW API RESPONSE FOR COMMENTS ---");
    console.log(JSON.stringify(rawIssues.issues?.[0]?.fields?.comment, null, 2));
    console.log("\n--- RAW API RESPONSE FOR CHANGELOG ---");
    console.log(JSON.stringify(rawIssues.issues?.[0]?.changelog?.histories, null, 2));

    process.exit(0);
}

testJira();
