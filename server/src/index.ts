import express, { Router } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import {
  AdminController,
  AuthenticationController,
  HttpsController,
  SocketController,
} from "controllers";
import { ChatsinoLogger } from "logging";
import {
  authenticatedRouteMiddleware,
  clientSettingMiddleware,
} from "middleware";
import * as config from "config";

const logger = new ChatsinoLogger("Main");

if (process.env.SCRIPT) {
  // When running as a script, perform a single task and close.
  (async () => {
    logger.info({ script: process.env.SCRIPT }, "Running a script.");

    const scripts = (await import("./scripts")) as Record<
      string,
      () => unknown
    >;
    const script = scripts[process.env.SCRIPT!];

    if (script) {
      await script();
      process.exit(0);
    } else {
      logger.fatal("Script does not exist.");
      process.exit(1);
    }
  })();
} else {
  // When running as a server, perform setup and listen on the specified port.
  (async () => {
    logger.info({ version: config.VERSION }, "Chatsino is starting up.");

    // Application
    logger.info("Initializing application.");

    const app = express();

    // -- Middleware
    app.use(
      bodyParser.json(),
      cookieParser(config.COOKIE_SECRET),
      clientSettingMiddleware
    );

    // -- Routes
    const apiRouter = Router();
    // ---- Authentication
    const authenticationController = new AuthenticationController();
    apiRouter.get(
      "/validate",
      authenticationController.handleValidationRequest
    );
    apiRouter.get("/ticket", authenticationController.handleTicketRequest);
    apiRouter.post("/signup", authenticationController.handleSignupRequest);
    apiRouter.post("/signin", authenticationController.handleSigninRequest);
    apiRouter.post("/signout", authenticationController.handleSignoutRequest);

    // ---- Admin
    const adminRouter = Router();
    adminRouter.use(authenticatedRouteMiddleware("admin:limited"));

    const adminController = new AdminController();
    adminRouter.post("/pay", adminController.handlePayRequest);
    adminRouter.post("/charge", adminController.handleChargeRequest);
    adminRouter.post(
      "/change-permission",
      authenticatedRouteMiddleware("admin:unlimited"),
      adminController.handleChangePermissionRequest
    );

    apiRouter.use("/admin", adminRouter);
    app.use("/api", apiRouter);

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
}
