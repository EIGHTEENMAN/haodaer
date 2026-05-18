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
    origin: process.env.CORS_ORIGIN || 'https://grandand.com',
  },
};

module.exports = config;
