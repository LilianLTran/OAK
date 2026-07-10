import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`OAK API listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
