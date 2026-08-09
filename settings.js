require("dotenv").config();

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {}
  },
  jwtSecret: process.env.JWT_SECRET,
  fonnteToken: process.env.FONNTE_TOKEN,
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    ownerId: process.env.TELEGRAM_OWNER_ID
  },
  cronSecret: process.env.CRON_SECRET,
  defaults: {
    premiumDays: Number(process.env.PREMIUM_DEFAULT_DAYS || 30),
    premiumDailyLimit: Number(process.env.PREMIUM_DAILY_LIMIT || 1000),
    freeDailyLimit: Number(process.env.FREE_DAILY_LIMIT || 100),
    freeApiKey: "RyuuXiao"
  }
};
