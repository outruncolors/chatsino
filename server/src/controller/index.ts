import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoClient, authenticate } from "auth";
import { ChatsinoLogger } from "logging";

export class ChatsinoController {
  public static instance = new ChatsinoController();

  private logger = ChatsinoLogger.instance;
  private socketToClientMap = new Map<WebSocket, ChatsinoClient>();

  public handleConnection = (ws: WebSocket, _: IncomingMessage) => {
    this.logger.info({ client: this.getClientName(ws) }, "Client connected.");

    ws.on("message", (data) => this.handleReceiveMessage(ws, data));
  };

  public handleReceiveMessage = (ws: WebSocket, data: RawData) => {
    const message = data.toString();

    this.logger.info(
      { client: this.getClientName(ws), message },
      "Received a message from a client."
    );

    // Do stuff.
  };

  public handleSendMessage = (ws: WebSocket, message: string) => {
    this.logger.info(
      { client: this.getClientName(ws), message },
      "Sending a message to a client."
    );

    ws.send(message);
  };

  public handleUpgradeRequest = async (
    wss: WebSocketServer,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    try {
      this.logger.info("Attempting to authenticate a client.");

      const client = await authenticate();

      wss.handleUpgrade(request, socket, head, (ws) => {
        this.logger.info({ client: client.name }, "Client authenticated.");

        this.socketToClientMap.set(ws, client);

        wss.emit("connection", ws, request);
      });
    } catch (error) {
      this.logger.error("Failed to authenticate client.");

      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  };

  private getClientName = (ws: WebSocket) => {
    const client = this.socketToClientMap.get(ws);

    return client?.name ?? "<unknown>";
  };
}
