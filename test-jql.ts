import { JiraClient } from './src/services/jira-client';
import mongoose from 'mongoose';
import { User } from './src/models/user';
import { decrypt } from './src/services/encryption';
import dotenv from 'dotenv';

dotenv.config();

async function testJql() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jira-bot');

    const user = await User.findOne({ isActive: true });
    if (!user) process.exit(1);

    const client = new JiraClient(user.jiraHost, user.jiraEmail, process.env.ENCRYPTION_KEY ? decrypt(user.jiraApiToken, process.env.ENCRYPTION_KEY) : user.jiraApiToken);

    const jqlsToTest = [
        'updater = currentUser()',
        `issue in updatedBy("${user.jiraEmail}")`,
        `issue in updatedBy(currentUser)` // sometimes currentUser without () works
    ];

    for (const jql of jqlsToTest) {
        console.log(`\nTesting JQL: ${jql}`);
        try {
            const issues = await client.searchIssues(jql);
            console.log(`Success! Found ${issues.length} issues.`);
        } catch (error: any) {
            const detail = error.response?.data?.errorMessages?.join(', ') || error.response?.data?.errorMessages || error.message;
            console.error(`Failed: ${detail}`);
        }
    }

    process.exit(0);
}

testJql();
