/**
 * MEDiKIOSK Backend — Phase 01: Server Entry Point
 * Initializes database connectivity, starts HTTP listener, and manages graceful shutdown.
 */

import { app } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

import { authService } from './services/auth.service.js';

async function startServer(): Promise<void> {
  logger.info('Starting MEDiKIOSK Backend Service...', {
    environment: config.NODE_ENV,
    port: config.PORT
  });

  // 1. Establish MongoDB Connection
  await connectDatabase();

  // 2. Seed Default Accounts if needed
  await authService.seedDefaultAccounts();

  // 2. Start HTTP Server
  const server = app.listen(config.PORT, () => {
    logger.info(`MEDiKIOSK backend server running on http://localhost:${config.PORT}`, {
      healthEndpoint: `http://localhost:${config.PORT}/health`,
      apiV1Endpoint: `http://localhost:${config.PORT}/api/v1`
    });
  });

  // 3. Graceful Shutdown Management
  let isShuttingDown = false;

  async function handleShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Disconnect from MongoDB
      await disconnectDatabase();

      logger.info('MEDiKIOSK backend service stopped cleanly.');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded. Forcing exit.');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception detected', { error: error.message, stack: error.stack });
    handleShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection detected', { reason });
  });
}

startServer().catch((error) => {
  logger.error('Fatal failure starting MEDiKIOSK backend', {
    error: error instanceof Error ? error.message : error
  });
  process.exit(1);
});
