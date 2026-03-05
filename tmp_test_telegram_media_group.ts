import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', { polling: false });

async function run() {
    const chatId = '285971294'; // kien's Chat ID from logs

    // Create some dummy image buffers
    // 1x1 pngs
    const buf1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const buf2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

    const media: TelegramBot.InputMediaPhoto[] = [
        { type: 'photo', media: buf1 as any }, // buffer directly
        { type: 'photo', media: buf2 as any }, // buffer directly
    ];

    try {
        console.log('Sending media group...');
        await bot.sendMediaGroup(chatId, media);
        console.log('Media group sent successfully.');
    } catch (e: any) {
        console.error('Failed code:', e.code);
        console.error('Failed message:', e.message);
        if (e.response && e.response.body) {
            console.error('Response body:', e.response.body);
        }
    }
}

run().catch(console.error);
