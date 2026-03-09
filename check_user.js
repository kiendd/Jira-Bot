const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./dist/models/user.js');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({});
    for (const user of users) {
        console.log(`User ${user.chatId} JQL: ${user.jql}`);
        console.log(`User ${user.chatId} Preferences:`, JSON.stringify(user.preferences, null, 2));
    }
    process.exit(0);
}
run();
