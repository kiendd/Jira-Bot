import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferences {
    trackStatus: boolean;
    trackAssignee: boolean;
    relationshipScopes: {
        assigned: boolean;
        created: boolean;
        participated: boolean;
        watched: boolean;
    };
    projectScopes: string[];
    schedule: {
        timezone: string;
        activeDays: number[];
        startTime: string; // HH:mm
        endTime: string; // HH:mm
    };
}

export interface IUser extends Document {
    chatId: string;
    jiraHost: string;
    jiraEmail: string;
    jiraApiToken: string; // Will be encrypted in Phase 4
    jql: string;
    isActive: boolean;
    preferences: IUserPreferences;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        chatId: { type: String, required: true, unique: true, index: true },
        jiraHost: { type: String, required: true },
        jiraEmail: { type: String, required: true },
        jiraApiToken: { type: String, required: true },
        jql: { type: String, default: 'updated > -1d' },
        isActive: { type: Boolean, default: true },
        preferences: {
            trackStatus: { type: Boolean, default: true },
            trackAssignee: { type: Boolean, default: true },
            relationshipScopes: {
                assigned: { type: Boolean, default: true },
                created: { type: Boolean, default: true },
                participated: { type: Boolean, default: false },
                watched: { type: Boolean, default: false },
            },
            projectScopes: { type: [String], default: [] },
            schedule: {
                timezone: { type: String, default: 'UTC' },
                activeDays: { type: [Number], default: [1, 2, 3, 4, 5] },
                startTime: { type: String, default: '00:00' },
                endTime: { type: String, default: '23:59' },
            },
        },
    },
    { timestamps: true },
);

export const User = mongoose.model<IUser>('User', UserSchema);
