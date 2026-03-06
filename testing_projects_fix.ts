import { Version2Client } from 'jira.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from './src/models/user';
import { decrypt } from './src/services/encryption';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || '');
    const user = await User.findOne({ isActive: true });
    if (!user) { console.log('No user'); return; }

    let token = user.jiraApiToken;
    if (process.env.ENCRYPTION_KEY) {
        try { token = decrypt(token, process.env.ENCRYPTION_KEY); } catch (e) { }
    }

    const cleanHost = user.jiraHost.replace(/\/+$/, '');
    const isCloud = cleanHost.includes('.atlassian.net');

    let authentication: any;
    if (isCloud) {
        authentication = { basic: { email: user.jiraEmail, apiToken: token } };
    } else {
        authentication = { personalAccessToken: token };
    }

    const client = new Version2Client({
        host: cleanHost,
        authentication
    });

    try {
        console.log('Fetching projects directly via sendRequest...');
        const response = await (client as any).sendRequest({
            url: '/rest/api/2/project',
            method: 'GET'
        });
        console.log(`Found ${response.length} projects.`);
        console.log('Sample:', JSON.stringify(response[0], null, 2));
    } catch (e: any) {
        console.error('Failed API:', e.message);
        if (e.response) {
            console.error('Response body:', e.response.data || e.response.body);
            console.error('Status:', e.response.status);
        }
    }
    mongoose.disconnect();
}
run();
