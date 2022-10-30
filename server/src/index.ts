import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { SocketController } from "controllers";
import { ChatsinoLogger } from "logging";
import { ClientRepository } from "repositories";
import * as config from "config";
import { TestService } from "services";

(async () => {
  await ClientRepository.instance.initialize();

  const server = createServer({
    cert: readFileSync(config.SSL_CERTIFICATE_PATH),
    key: readFileSync(config.SSL_KEY_PATH),
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", SocketController.instance.handleConnection);

  server.on("upgrade", (request, socket, head) =>
    SocketController.instance.handleUpgradeRequest(wss, request, socket, head)
  );

  server.listen(config.PORT, () => {
    ChatsinoLogger.instance.info({ port: config.PORT }, "Server is listening.");
  });

  process.on("uncaughtException", (error) => {
    ChatsinoLogger.instance.fatal({ error }, "Detected an uncaught exception.");
    process.exit(1);
  });

  process.on("unhandledRejection", (error) => {
    ChatsinoLogger.instance.fatal(
      { error },
      "Detected an unhandled rejection."
    );
    process.exit(1);
  });

  TestService.instance.signinFirstUser();
})();
