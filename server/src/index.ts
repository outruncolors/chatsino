import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { SocketController } from "controllers";
import { ChatsinoLogger } from "logging";
import { ClientRepository } from "repositories";
import { TestService } from "services";
import * as config from "config";

(async () => {
  await ClientRepository.instance.initialize();

  const server = createServer({
    cert: readFileSync(config.SSL_CERTIFICATE_PATH),
    key: readFileSync(config.SSL_KEY_PATH),
  });

  const wss = new WebSocketServer({ noServer: true });

  SocketController.instance.checkForDeadConnections(wss);

  wss.on("connection", SocketController.instance.handleConnection);
  wss.on("error", SocketController.instance.handleError);
  wss.on("close", SocketController.instance.handleClose);

  server.on("upgrade", (request, socket, head) =>
    SocketController.instance.handleUpgradeRequest(wss, request, socket, head)
  );

  server.listen(config.PORT, () => {
    ChatsinoLogger.instance.info({ port: config.PORT }, "Server is listening.");
  });

  process.on("uncaughtException", (error) => {
    ChatsinoLogger.instance.fatal({ error }, "Detected an uncaught exception.");
    SocketController.instance.handleClose();
    process.exit(1);
  });

  process.on("unhandledRejection", (error) => {
    ChatsinoLogger.instance.fatal(
      { error },
      "Detected an unhandled rejection."
    );
    SocketController.instance.handleClose();
    process.exit(1);
  });

  await TestService.instance.createFirstUser();
  TestService.instance.signinFirstUser();
})();
