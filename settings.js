
module.exports = {
  appName: 'RyuuXiao Portal',
  defaultFreeApiKey: 'RyuuXiao',
  freeDailyLimit: 25,
  premiumDailyLimit: 500,
  premiumWarnDays: [7, 3, 1],
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean),
  mongoUri: process.env.MONGODB_URI || '',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramOwnerId: process.env.TELEGRAM_OWNER_ID || '',
  fonnteToken: process.env.FONNTE_TOKEN || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me-now',
  port: Number(process.env.PORT || 3000),
};
