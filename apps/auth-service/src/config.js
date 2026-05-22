const config = {
  port: parseInt(process.env.PORT || '3007', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'haodaer-jwt-secret-dev',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  sms: {
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '好大儿',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  db: {
    path: process.env.DB_PATH || './data/auth.db',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === 'https://grandand.com' || /^https:\/\/[a-z0-9-]+\.grandand\.com$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow in dev
      }
    },
  },
  cookieDomain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.grandand.com' : ''),
};

module.exports = config;
