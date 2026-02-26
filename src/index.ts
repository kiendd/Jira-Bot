import { loadConfig } from './config';
import { connectDB, disconnectDB } from './services/db';
import { ConsoleNotifier, Notifier } from './services/notifier';
import { TelegramNotifier } from './services/telegram';
import { MonitorService } from './services/monitor';

async function main(): Promise<void> {
    console.log('=== Jira Monitor Bot ===');
    console.log(`Started at: ${new Date().toISOString()}`);

    // Load configuration
    const config = loadConfig();

    // Connect to MongoDB
    await connectDB(config.mongodbUri);

    // Initialize notifier
    let notifier: Notifier;
    if (config.telegram) {
        notifier = new TelegramNotifier(config.telegram.botToken, config.encryptionKey);
        console.log('[Main] Using Telegram notifier with commands (/start /setup /status /stop).');
    } else {
        notifier = new ConsoleNotifier();
        console.log('[Main] Using Console notifier (set TELEGRAM_BOT_TOKEN for Telegram).');
    }

    // Initialize monitor service
    const monitor = new MonitorService(
        notifier,
        config.pollIntervalMs,
        config.debounceWindowMs,
        config.encryptionKey,
    );

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n[Main] Shutting down...');
        monitor.stop();
        await disconnectDB();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start monitoring
    await monitor.start();
}

main().catch((error) => {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
});
