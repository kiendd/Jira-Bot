import mongoose, { Schema, Document } from 'mongoose';

export interface IIssueState extends Document {
    chatId: string;
    issueKey: string;
    lastUpdated: string; // ISO timestamp from Jira
    status: string;
    assignee: string | null;
    updatedAt: Date;
}

const IssueStateSchema = new Schema<IIssueState>(
    {
        chatId: { type: String, required: true, index: true },
        issueKey: { type: String, required: true },
        lastUpdated: { type: String, required: true },
        status: { type: String, default: 'Unknown' },
        assignee: { type: String, default: null },
    },
    { timestamps: true },
);

// Compound index for fast lookup by user + issue
IssueStateSchema.index({ chatId: 1, issueKey: 1 }, { unique: true });

export const IssueState = mongoose.model<IIssueState>(
    'IssueState',
    IssueStateSchema,
);
