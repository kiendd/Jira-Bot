import { Version2Client } from 'jira.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const email = 'kien@example.com'; // Doesn't matter for this quick check if basic, but we use PAT usually here?
    // Let's use the actual User credentials from DB to test.
    
    import mongoose from 'mongoose';
    import { User } from './src/models/user';
    import { decrypt } from './src/services/encryption';
    
    await mongoose.connect(process.env.MONGODB_URI || '');
    const user = await User.findOne({ isActive: true });
    if (!user) { console.log('No user'); return; }
    
    let token = user.jiraApiToken;
    if (process.env.ENCRYPTION_KEY) {
        try { token = decrypt(token, process.env.ENCRYPTION_KEY); } catch (e) {}
    }
    
    const client = new Version2Client({
        host: user.jiraHost,
        authentication: { personalAccessToken: token }
    });
    
    try {
        const projects = await client.projects.getAllProjects();
        console.log(`Found ${projects.length} projects.`);
        if (projects.length > 0) {
            console.log('Sample:', projects[0].key, projects[0].name);
        }
    } catch (e: any) {
        console.error('Failed API:', e.message);
    }
    mongoose.disconnect();
}
run();
