import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@empresa.pt',

  driveServiceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  driveRootFolderId: process.env.DRIVE_ROOT_FOLDER_ID,

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramBackofficeChatId: process.env.TELEGRAM_BACKOFFICE_CHAT_ID,
};

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL não definido — usa .env (ver .env.example)');
}
if (!config.googleClientId) {
  console.warn('[config] GOOGLE_CLIENT_ID não definido — login Google vai falhar');
}

export default config;
