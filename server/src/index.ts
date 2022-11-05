import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import {
  AuthenticationController,
  HttpsController,
  SocketController,
} from "controllers";
import { ChatsinoLogger } from "logging";
import { clientSettingMiddleware } from "middleware";
import * as config from "config";

(async () => {
  // Logging
  const logger = new ChatsinoLogger("Main");
  logger.info({ version: config.VERSION }, "Chatsino is starting up.");

  // Application
  logger.info("Initializing application.");

  const app = express();

  // -- Controllers
  const authenticationController = new AuthenticationController();

  // -- Middleware
  app.use(
    bodyParser.json(),
    cookieParser(config.COOKIE_SECRET),
    clientSettingMiddleware
  );

  // -- Routes
  // ---- Authentication
  app.get("/api/validate", authenticationController.handleValidationRequest);
  app.get("/api/ticket", authenticationController.handleTicketRequest);
  app.post("/api/signup", authenticationController.handleSignupRequest);
  app.post("/api/signin", authenticationController.handleSigninRequest);
  app.post("/api/signout", authenticationController.handleSignoutRequest);

  // HTTPS / WebSocket Servers
  logger.info("Initializing HTTPS and WebSocket servers.");

  const wss = new WebSocketServer({ noServer: true });
  const socketController = new SocketController(wss);
  const server = createServer(
    {
      cert: readFileSync(config.SSL_CERTIFICATE_PATH),
      key: readFileSync(config.SSL_KEY_PATH),
    },
    app
  );
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
