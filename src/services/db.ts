import mongoose from 'mongoose';

export async function connectDB(uri: string): Promise<void> {
    try {
        await mongoose.connect(uri);
        console.log('[DB] Connected to MongoDB.');
    } catch (error) {
        console.error('[DB] Connection failed:', (error as Error).message);
        throw error;
    }
}

export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
    console.log('[DB] Disconnected from MongoDB.');
}
