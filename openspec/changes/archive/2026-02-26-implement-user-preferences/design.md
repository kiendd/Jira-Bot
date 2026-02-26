# Design: User Preferences

## Architecture Updates

### 1. Database Model Updates
The `User` Mongoose model needs a new `preferences` sub-document:
```typescript
interface UserPreferences {
    trackStatus: boolean;      // default: true
    trackAssignee: boolean;    // default: true
    schedule: {
        timezone: string;      // default: 'UTC'
        activeDays: number[];  // default: [1,2,3,4,5] (Mon-Fri)
        startTime: string;     // default: '00:00' (HH:mm)
        endTime: string;       // default: '23:59' (HH:mm)
    };
}
```

### 2. MonitorService Logic 
In `checkStability`, before sending a notification:
1. **Filter Diffs**: Remove diffs for fields the user doesn't track (e.g., if `trackAssignee` is false, remove assignee diffs). If no diffs remain, skip notification.
2. **Quiet Hours Check**: Evaluate the user's `timezone` and `schedule`.
   - If the current time is outside `activeDays` or outside `startTime`-`endTime`, queue the notification (do not delete from `pendingChanges` or mark it as queued depending on exact requirements). For simplicity in this iteration, we can just drop the notification or keep it pending until working hours begin. Let's keep it pending by NOT removing it from `pendingChanges` until working hours resume.

### 3. Telegram Interactive Menu
Use Telegram's Inline Keyboard markup to render a `/settings` menu:
- [ Toggle Status Tracking (✅) ]
- [ Toggle Assignee Tracking (✅) ]
- [ Set Timezone ]

When a user clicks a button, the bot handles the `callback_query`, updates the database, and edits the message to reflect the new state.
