const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./dist/models/user.js');
const { buildJql } = require('./dist/services/telegram.js');

const defaultIgnored = ['rank', 'work ratio', 'sprint', 'epic link', 'components', 'component/s'];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({});
    for (const user of users) {
        if (!user.preferences.ignoredFields) {
            user.preferences.ignoredFields = [];
        }

        // Add defaults only if they are entirely missing
        const current = user.preferences.ignoredFields.map(f => f.toLowerCase());
        const newDefaults = defaultIgnored.filter(d => !current.includes(d));
        user.preferences.ignoredFields = [...user.preferences.ignoredFields, ...newDefaults];

        // Rebuild JQL
        user.jql = buildJql(
            user.preferences.relationshipScopes,
            user.preferences.projectScopes || [],
            user.jiraEmail
        );

        await user.save();
        console.log(`Migrated user ${user.chatId}:`);
        console.log(` > JQL: ${user.jql}`);
        console.log(` > Ignored Fields: ${user.preferences.ignoredFields}`);
    }
    process.exit(0);
}
run();
