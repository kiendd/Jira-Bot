import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', { polling: false });

async function run() {
    const chatId = '285971294'; // kien's Chat ID from logs

    const buf1 = Buffer.from('Hello world 1');
    const buf2 = Buffer.from('Hello world 2');

    const media: any[] = [
        { type: 'document', media: buf1 }, // buffer directly
        { type: 'document', media: buf2 }, // buffer directly
    ];

    try {
        console.log('Sending document group...');
        await bot.sendMediaGroup(chatId, media);
        console.log('Document group sent successfully.');
    } catch (e: any) {
        console.error('Failed code:', e.code);
        console.error('Failed message:', e.message);
        if (e.response && e.response.body) {
            console.error('Response body:', e.response.body);
        }
    }
}

run().catch(console.error);
