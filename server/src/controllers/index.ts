import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoLogger } from "logging";
import { secondsSince } from "helpers";
import { AuthorizationService, AuthorizedClient } from "services";

export class ChatsinoController {
  public static instance = new ChatsinoController();

  private logger = ChatsinoLogger.instance;
  private authorizationService = AuthorizationService.instance;
  private socketToClientMap = new Map<WebSocket, AuthorizedClient>();

  public handleConnection = (ws: WebSocket, _: IncomingMessage) => {
    this.logger.info(
      {
        client: this.getClientName(ws),
        "clients connected": this.socketToClientMap.size,
      },
      "Client connected."
    );

    ws.on("message", (data) => this.handleReceiveMessageFromClient(ws, data));
    ws.on("close", () => this.handleDisconnection(ws));
    ws.on("error", () => this.handleClientError(ws));
    ws.on("unexpected-response", () => this.handleClientUnexpectedResponse(ws));
  };

  public handleUpgradeRequest = async (
    wss: WebSocketServer,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    try {
      this.logger.info("Attempting to authenticate a client.");

      const client = await this.authorizationService.signin("foo", "bar");

      wss.handleUpgrade(request, socket, head, (ws) => {
        this.socketToClientMap.set(ws, client!);

        this.logger.info(
          { client: this.getClientName(ws) },
          "Client authenticated."
        );

        wss.emit("connection", ws, request);
      });
    } catch (error) {
      this.logger.error("Failed to authenticate client.");

      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  };

  private handleReceiveMessageFromClient = (ws: WebSocket, data: RawData) => {
    const message = data.toString();

    this.logger.info(
      { client: this.getClientName(ws), message },
      "Received a message from a client."
    );

    // Do stuff.
  };

  private handleSendMessageToClient = (ws: WebSocket, message: string) => {
    this.logger.info(
      { client: this.getClientName(ws), message },
      "Sending a message to a client."
    );

    ws.send(message);
  };

  private handleDisconnection = (ws: WebSocket) => {
    this.logger.info(
      {
        client: this.getClientName(ws),
        "connection duration": `${this.getClientConnectionDuration(ws)}s`,
        "clients connected": this.socketToClientMap.size,
      },
      "Client disconnected."
    );

    this.socketToClientMap.delete(ws);
  };

  private handleClientError = (ws: WebSocket) => {
    this.logger.error(
      {
        client: this.getClientName(ws),
      },
      "Client experienced an error."
    );

    // Handle.
  };

  private handleClientUnexpectedResponse = (ws: WebSocket) => {
    this.logger.error(
      {
        client: this.getClientName(ws),
      },
      "Client experienced an unexpected response."
    );

    // Handle.
  };

  private getClientName = (ws: WebSocket) => {
    const client = this.socketToClientMap.get(ws);

    return client?.username ?? "<unknown>";
  };

  private getClientConnectionDuration = (ws: WebSocket) => {
    const client = this.socketToClientMap.get(ws);

    return client ? secondsSince(client.connectedAt) : "<unknown>";
  };
}
