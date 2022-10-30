import { createServer } from "https";
import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { ChatsinoController } from "controllers";
import { ChatsinoLogger } from "logging";
import { ClientRepository } from "repositories";
import * as config from "config";

(async () => {
  await ClientRepository.instance.initialize();

  const server = createServer({
    cert: readFileSync(config.SSL_CERTIFICATE_PATH),
    key: readFileSync(config.SSL_KEY_PATH),
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", ChatsinoController.instance.handleConnection);

  server.on("upgrade", (request, socket, head) =>
    ChatsinoController.instance.handleUpgradeRequest(wss, request, socket, head)
  );

  ChatsinoLogger.instance.info({ port: config.PORT }, "Server is listening.");

  server.listen(config.PORT);

  // Protect against bubbled-up rejections and errors.
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
})();
