import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { HttpsController, SocketController } from "controllers";
import { ChatsinoLogger } from "logging";
import * as config from "config";

(async () => {
  // Logging
  const logger = new ChatsinoLogger("Main");

  logger.info({ version: config.VERSION }, "Chatsino is starting up.");

  // HTTPS / WebSocket Servers
  logger.info("Initializing HTTPS and WebSocket servers.");

  const wss = new WebSocketServer({ noServer: true });
  const socketController = new SocketController(wss);
  const server = createServer({
    cert: readFileSync(config.SSL_CERTIFICATE_PATH),
    key: readFileSync(config.SSL_KEY_PATH),
  });
  const httpsController = new HttpsController(server, socketController);

  // Error Handling
  logger.info("Initializing error handling.");

  process
    .on("uncaughtException", (error) => {
      logger.fatal({ error }, "Detected an uncaught exception.");
      socketController.shutdown();
      httpsController.shutdown();
      process.exit(1);
    })
    .on("unhandledRejection", (error) => {
      logger.fatal({ error }, "Detected an unhandled rejection.");
      socketController.shutdown();
      httpsController.shutdown();
      process.exit(1);
    })
    .on("exit", (exitCode) => {
      logger.info({ exitCode }, "Chatsino is shutting down. Goodbye!");
    });

  // Listen for connections
  httpsController.listen();
})();
