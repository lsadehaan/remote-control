import { createServer } from 'http';
import { app } from './app.js';
import { initWebSocket } from './websocket/index.js';
import { initDatabase } from './db/index.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

async function main() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized');

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket server
    initWebSocket(server);
    logger.info('WebSocket server initialized');

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

main();
