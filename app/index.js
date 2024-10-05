const express = require("express");
const { Telegraf } = require('telegraf');
const { Client } = require('pg');

const app = express();
const bot = new Telegraf('7765016070:AAECC96r9QBex-Zb6yjYJ8jS-U2eqKM29Vo'); // Replace with your actual bot token

const client = new Client({
    connectionString: 'postgresql://postgres.xqbhpmfdckbdssepvdlp:10010512111111497@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false,
    },
});

client.connect();

bot.start(async (ctx) => {
    const telegramId = ctx.from.id;
    const fullName = `${ctx.from.first_name} ${ctx.from.last_name || ''}`;
    const username = ctx.from.username ? `@${ctx.from.username}` : null;
    const referralLink = ctx.message.text.split(' ')[1] || null;
    const phone = null; // Placeholder for phone number
    const botUsername = 'zephyrgame_bot'; // Your bot's username

    try {
        // Check if user already exists in the database
        const userCheck = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);

        if (userCheck.rows.length === 0) {
            // Insert new user into the database
            await client.query(
                'INSERT INTO users (full_name, telegram_id, username, phone, referral_link, referral_users) VALUES ($1, $2, $3, $4, $5, $6)',
                [fullName, telegramId, username, phone, `ref_${telegramId}`, []]
            );
            const fullReferralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
            ctx.reply(`Welcome, fren! We're glad to see you in here. Wait for the game... And you can invite your frens to the game until it is done: ${fullReferralLink}`);
        } else {
            const fullReferralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
            ctx.reply(`Welcome back, fren!`);
        }

        // If the user joined through a referral link
        if (referralLink) {
            const referrerId = referralLink.replace('ref_', ''); // Extract referrer ID
            await client.query(
                'UPDATE users SET referral_users = array_append(referral_users, $1) WHERE telegram_id = $2',
                [telegramId, referrerId]
            );
            const referrerInfo = await client.query('SELECT * FROM users WHERE telegram_id = $1', [referrerId]);

            if (referrerInfo.rows.length > 0) {
                const referrerName = referrerInfo.rows[0].full_name;
                const referrerUsername = referrerInfo.rows[0].username || 'No username';
                ctx.reply(`You've been invited by ${referrerName} (${referrerUsername}).`);
            } else {
                ctx.reply('Taklif qilgan foydalanuvchi topilmadi.');
            }
        }

        // Add Web App Button for the mini-app
        await ctx.reply('Click the button below to open the mini app:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Open Mini App",
                            web_app: { url: "https://rainbow-cuchufli-5cc472.netlify.app" } // URL to your mini app
                        }
                    ]
                ]
            }
        });

    } catch (err) {
        console.error('Error while inserting user:', err);
        ctx.reply('Xatolik yuz berdi.');
    }
});

// Bot launch
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

app.listen(3000, () => {
    console.log("Bot is running");
});
