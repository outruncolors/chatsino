import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoLogger } from "logging";
import { secondsSince } from "helpers";
import { AuthenticationService, AuthenticatedClient } from "services";
import * as config from "config";

export class SocketController {
  public static instance = new SocketController();

  private logger = ChatsinoLogger.instance;
  private authorizationService = AuthenticationService.instance;
  private socketToClientMap = new Map<WebSocket, AuthenticatedClient>();
  private socketToAliveMap = new Map<WebSocket, boolean>();
  private checkingForDeadConnections: null | NodeJS.Timeout = null;

  public handleConnection = async (ws: WebSocket) => {
    try {
      this.logger.info("A client is attempting to connect.");

      await this.verifyClient(ws);

      ws.on("message", (data) => this.handleClientMessage(ws, data));
      ws.on("close", () => this.handleClientClose(ws));
      ws.on("error", () => this.handleClientError(ws));
      ws.on("pong", () => this.handleClientPong(ws));
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

  public handleError = (error: Error) => {
    this.logger.error(
      { error: (error as Error).message },
      "Socket server encountered an error."
    );

    // Handle.
  };

  public handleClose = () => {
    this.logger.info("SocketController is shutting down.");

    if (this.checkingForDeadConnections) {
      clearTimeout(this.checkingForDeadConnections);
    }
  };

  public handleUpgradeRequest = async (
    wss: WebSocketServer,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    try {
      this.logger.info("Attempting to authenticate a client.");

      const ws = await new Promise<WebSocket>((resolve) =>
        wss.handleUpgrade(request, socket, head, (ws) => resolve(ws))
      );

      const client = await this.authorizationService.signin(
        "user6",
        "password"
      );

      this.socketToClientMap.set(ws, client);
      this.socketToAliveMap.set(ws, true);

      this.logger.info(
        { client: this.getClientName(ws) },
        "Client successfully authenticated."
      );

      wss.emit("connection", ws, request);
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to authenticate client."
      );

      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  };

  public checkForDeadConnections = (wss: WebSocketServer) => {
    this.checkingForDeadConnections = setTimeout(() => {
      this.logger.info("Checking for dead connections.");

      let terminationCount = 0;

      for (const ws of wss.clients) {
        const isAlive = this.socketToAliveMap.get(ws);

        if (isAlive) {
          this.socketToAliveMap.set(ws, false);

          ws.ping();
        } else {
          this.logger.info(
            { client: this.getClientName(ws) },
            "Terminating a dead connection."
          );

          ws.terminate();

          terminationCount++;
        }
      }

      if (terminationCount === 0) {
        this.logger.info(`All connections were still alive.`);
      } else {
        this.logger.info(`Terminated ${terminationCount} dead connections.`);
      }

      this.checkForDeadConnections(wss);

      this.logger.info("Finished checking for dead connections.");
    }, config.DEAD_CONNECTION_CHECK_RATE);
  };

  private handleClientMessage = async (ws: WebSocket, data: RawData) => {
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
        "Failed to receive message from client."
      );
    }
  };

  private handleClientPong = (ws: WebSocket) => {
    this.socketToAliveMap.set(ws, true);
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

  private handleClientClose = (ws: WebSocket) => {
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
        "Attempting to verify a client."
      );

      const client = this.socketToClientMap.get(ws);

      if (client) {
        const isValid = await this.authorizationService.validateToken(
          client.tokens.access
        );

        if (isValid) {
          this.logger.info(
            { client: this.getClientName(ws) },
            "Successfully verified a client."
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
        throw new Error("client was not previously authenticated.");
      }
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to verify client."
      );

      // Redirect client to initial screen and prompt signin.
    }
  };
}
