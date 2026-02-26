import mongoose from 'mongoose';
import { User } from './src/models/user';
import { buildJql } from './src/services/telegram';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserJql() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jira-bot');

    const users = await User.find({ isActive: true });
    for (const user of users) {
        console.log(`Checking user ${user.chatId}...`);
        console.log(`Current JQL: ${user.jql}`);

        if (user.jql.includes('commentedIssues()') || user.jql.includes('updatedBy(currentUser())')) {
            console.log('User has broken JQL. Rebuilding...');
            const scopes = user.preferences?.relationshipScopes || {
                assigned: true,
                created: true,
                participated: false,
                watched: false
            };

            const newJql = buildJql(scopes, user.jiraEmail);
            console.log(`New JQL will be: ${newJql}`);

            user.jql = newJql;
            await user.save();
            console.log(`Updated user ${user.chatId} successfully.`);
        } else {
            console.log('Skipping user - JQL looks fine or is custom.');
        }
    }

    process.exit(0);
}

fixUserJql();
