const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./dist/models/user.js');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({});
    console.log("User preferences ignoredFields:", user.preferences.ignoredFields);
    process.exit(0);
}
run();
