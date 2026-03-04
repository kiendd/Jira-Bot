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

    console.log(`Checking issue DC5FC-2205...`);
    console.log(`User email: ${user.jiraEmail}`);

    try {
        const jql = 'issue = "DC5FC-2205"';
        const issues = await client.searchIssues(jql);

        if (issues.length > 0) {
            const issue = issues[0];
            const previousState = await IssueState.findOne({ chatId: user.chatId, issueKey: issue.key });

            console.log(`\n--- MonitorService Verification ---`);
            const isFirstPoll = false; // Assume bot is running normally
            const hasChanged = (!previousState && isFirstPoll) || (previousState && previousState.lastUpdated !== issue.updated);
            const isNewTask = !previousState && !isFirstPoll;

            console.log(`hasChanged: ${hasChanged}`);
            console.log(`isNewTask: ${isNewTask}`);

            if (hasChanged || isNewTask) {
                if (hasChanged && previousState) {
                    const isSelfAction = (issue.lastUpdaterEmail && issue.lastUpdaterEmail === user.jiraEmail) ||
                        (issue.lastUpdaterName && issue.lastUpdaterName === user.jiraEmail);
                    console.log(`isSelfAction: ${isSelfAction} (UpdaterEmail: ${issue.lastUpdaterEmail}, UpdaterName: ${issue.lastUpdaterName})`);

                    if (isSelfAction) {
                        console.log(`--> VERDICT: Ignored due to self-action change.`);
                        return;
                    }
                }

                console.log(`--> VERDICT: Would be added to pending list for debounce.`);

                // Check preferences
                const prefs = user.preferences || { trackStatus: true, trackAssignee: true, schedule: { timezone: 'UTC', activeDays: [1, 2, 3, 4, 5], startTime: '00:00', endTime: '23:59' } };
                console.log(`User Schedule: ${JSON.stringify(prefs.schedule)}`);

                const now = new Date();
                const tz = prefs.schedule.timezone;
                const formatterOptions: Intl.DateTimeFormatOptions = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long' };
                const dtFormatter = new Intl.DateTimeFormat('en-US', formatterOptions);
                const parts = dtFormatter.formatToParts(now);

                const currentHm = `${parts.find(p => p.type === 'hour')?.value || '00'}:${parts.find(p => p.type === 'minute')?.value || '00'}`;
                const weekdayPartStr = parts.find(p => p.type === 'weekday')?.value || 'Monday';
                const weekdays: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                const currentDay = weekdays[weekdayPartStr];

                const isWorkDay = prefs.schedule.activeDays.includes(currentDay);
                const isWorkHour = currentHm >= prefs.schedule.startTime && currentHm <= prefs.schedule.endTime;

                console.log(`Current Time (${tz}): ${weekdayPartStr} ${currentHm} (Day: ${currentDay})`);
                console.log(`isWorkDay: ${isWorkDay}, isWorkHour: ${isWorkHour}`);

                if (!isWorkDay || !isWorkHour) {
                    console.log(`--> VERDICT: Ignored because it's outside working hours!`);
                } else {
                    console.log(`--> VERDICT: Notification would fire immediately!`);
                }
            } else if (!previousState && isFirstPoll) {
                console.log(`--> VERDICT: Ignored because it's the first poll (isNew) and previousState is null. It just establishes the baseline in DB.`);
            } else {
                console.log(`--> VERDICT: Ignored because nothing has changed (Jira updated == DB updated).`);
            }
        } else {
            console.log(`Issue not found in Jira or no access.`);
        }

        console.log(`\nTesting if DC5FC-2205 is in user's JQL...`);
        const userIssues = await client.searchIssues(user.jql);
        const found = userIssues.find(i => i.key === "DC5FC-2205");
        if (found) {
            console.log(`YES: Issue is included in user's JQL results.`);
        } else {
            console.log(`NO: Issue is NOT in user's JQL results.`);
        }

        console.log(`\nChecking latest IssueState in DB to see when bot last polled...`);
        const latestState = await IssueState.findOne({ chatId: user.chatId }).sort({ lastUpdated: -1 });
        if (latestState) {
            console.log(`Most recent issue state in DB updated at: ${latestState.lastUpdated} for issue ${latestState.issueKey}`);
        } else {
            console.log(`NO issues found in DB for user!`);
        }
    } catch (error: any) {
        console.error(`Failed to fetch issue:`, error.message);
    }

    process.exit(0);
}

checkIssue();
