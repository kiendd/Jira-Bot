import dotenv from 'dotenv';
dotenv.config();

export interface Config {
    mongodbUri: string;
    telegram: {
        botToken: string;
    } | null;
    encryptionKey: string | null;
    pollIntervalMs: number;
    debounceWindowMs: number;
}

export function loadConfig(): Config {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
        throw new Error('Missing required env var: MONGODB_URI');
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegram = telegramToken ? { botToken: telegramToken } : null;

    const encryptionKey = process.env.ENCRYPTION_KEY || null;

    return {
        mongodbUri,
        telegram,
        encryptionKey,
        pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '300000', 10),
        debounceWindowMs: parseInt(process.env.DEBOUNCE_WINDOW_MS || '300000', 10),
    };
}
