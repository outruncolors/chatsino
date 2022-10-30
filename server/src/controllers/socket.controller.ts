import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoLogger } from "logging";
import { secondsSince } from "helpers";
import { AuthorizationService, AuthorizedClient } from "services";

export class SocketController {
  public static instance = new SocketController();

  private logger = ChatsinoLogger.instance;
  private authorizationService = AuthorizationService.instance;
  private socketToClientMap = new Map<WebSocket, AuthorizedClient>();

  public handleConnection = async (ws: WebSocket) => {
    try {
      this.logger.info("A Client is attempting to connect.");

      await this.verifyClient(ws);

      ws.on("message", (data) => this.handleReceiveMessageFromClient(ws, data));
      ws.on("close", () => this.handleDisconnection(ws));
      ws.on("error", () => this.handleClientError(ws));
      ws.on("unexpected-response", () =>
        this.handleClientUnexpectedResponse(ws)
      );

      this.logger.info(
        {
          client: this.getClientName(ws),
          "clients connected": this.socketToClientMap.size,
        },
        "Client successfully connected."
      );
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Client failed to connect."
      );
    }
  };

  public handleUpgradeRequest = async (
    wss: WebSocketServer,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    try {
      this.logger.info("Attempting to authenticate a Client.");

      const ws = await new Promise<WebSocket>((resolve) =>
        wss.handleUpgrade(request, socket, head, (ws) => resolve(ws))
      );

      const client = await this.authorizationService.signin(
        "user6",
        "password"
      );

      this.socketToClientMap.set(ws, client);

      this.logger.info(
        { client: this.getClientName(ws) },
        "Client authenticated."
      );

      wss.emit("connection", ws, request);
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to authenticate Client."
      );

      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  };

  private handleReceiveMessageFromClient = async (
    ws: WebSocket,
    data: RawData
  ) => {
    try {
      await this.verifyClient(ws);

      const message = data.toString();

      this.logger.info(
        { client: this.getClientName(ws), message },
        "Received a message from a client."
      );

      // Do stuff.
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to receive message from Client."
      );
    }
  };

  private handleSendMessageToClient = (ws: WebSocket, message: string) => {
    this.logger.info(
      { client: this.getClientName(ws), message },
      "Sending a message to a Client."
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

  private verifyClient = async (ws: WebSocket) => {
    try {
      this.logger.info(
        { client: this.getClientName(ws) },
        "Attempting to verify Client."
      );

      const client = this.socketToClientMap.get(ws);

      if (client) {
        const isValid = await this.authorizationService.validateToken(
          client.tokens.access
        );

        if (isValid) {
          this.logger.info(
            { client: this.getClientName(ws) },
            "Successfully verified Client."
          );
        } else {
          this.logger.info(
            { client: this.getClientName(ws) },
            "Client's access token is no longer valid -- attempting to refresh."
          );

          await this.authorizationService.refreshToken(client);

          this.logger.info(
            { client: this.getClientName(ws) },
            "Client's tokens were refreshed."
          );
        }
      } else {
        throw new Error("Client was not previously authenticated.");
      }
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to verify Client."
      );

      // Redirect client to initial screen and prompt signin.
    }
  };
}
