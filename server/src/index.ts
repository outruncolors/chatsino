import { createServer } from "https";
import { readFileSync } from "fs";
import path from "path";
import { WebSocketServer } from "ws";
import { ChatsinoController } from "controller";
import { ChatsinoLogger } from "logging";

const server = createServer({
  cert: readFileSync(path.join(__dirname, "../.ssh/localhost.pem")),
  key: readFileSync(path.join(__dirname, "../.ssh/localhost-key.pem")),
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", ChatsinoController.instance.handleConnection);

server.on("upgrade", (request, socket, head) =>
  ChatsinoController.instance.handleUpgradeRequest(wss, request, socket, head)
);

ChatsinoLogger.instance.info({ port: 8080 }, "Server is listening.");

server.listen(8080);

// Protect against bubbled-up rejections and errors.
process.on("uncaughtException", (error) => {
  ChatsinoLogger.instance.fatal({ error }, "Detected an uncaught exception.");
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  ChatsinoLogger.instance.fatal({ error }, "Detected an unhandled rejection.");
  process.exit(1);
});
