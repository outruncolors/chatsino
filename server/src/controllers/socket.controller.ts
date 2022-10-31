import { Request, RequestHandler, Response } from "express";
import { Session } from "express-session";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoLogger } from "logging";
import { secondsSince } from "helpers";
import { AuthenticationService, AuthenticatedClient } from "services";
import * as config from "config";

export class SocketController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private authenticationService = AuthenticationService.instance;
  private socketToClientMap = new Map<WebSocket, AuthenticatedClient>();
  private socketToAliveMap = new Map<WebSocket, boolean>();
  private wss: WebSocketServer;
  private sessionParser: RequestHandler;
  private checkingForDeadConnections: NodeJS.Timeout;

  public constructor(wss: WebSocketServer, sessionParser: RequestHandler) {
    wss.on("close", this.handleServerClose);
    wss.on("connection", this.handleConnection);
    wss.on("error", this.handleServerError);

    this.wss = wss;
    this.sessionParser = sessionParser;
    this.checkingForDeadConnections = this.checkForDeadConnections();
  }

  public shutdown = () => this.handleServerClose();

  public add = async (request: Request, socket: Duplex, head: Buffer) =>
    this.sessionParser(request, {} as unknown as Response, async () => {
      this.logger.info("Attempting to authenticate a client.");

      const session = request.session as Session & {
        client: AuthenticatedClient;
      };

      if (session.client) {
        const ws = await new Promise<WebSocket>((resolve) =>
          this.wss.handleUpgrade(request, socket, head, resolve)
        );

        this.socketToClientMap.set(ws, session.client);
        this.socketToAliveMap.set(ws, true);

        this.logger.info(
          { client: this.getClientName(ws) },
          "Client successfully authenticated."
        );

        this.wss.emit("connection", ws, request);
      } else {
        this.logger.error("Failed to authenticate client.");

        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
      }
    });

  private handleServerClose = () => {
    this.logger.info("SocketController is shutting down.");

    if (this.checkingForDeadConnections) {
      clearTimeout(this.checkingForDeadConnections);
    }
  };

  private handleConnection = async (ws: WebSocket) => {
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

  private handleServerError = (error: Error) => {
    this.logger.error(
      { error: (error as Error).message },
      "Socket server encountered an error."
    );

    // Handle.
  };

  private checkForDeadConnections = () => {
    return setTimeout(() => {
      if (this.wss.clients.size > 0) {
        this.logger.info("Checking for dead connections.");

        let terminationCount = 0;

        for (const ws of this.wss.clients) {
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

        this.logger.info("Finished checking for dead connections.");
      }

      this.checkingForDeadConnections = this.checkForDeadConnections();
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
        const isValid = await this.authenticationService.validateToken(
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

          await this.authenticationService.refreshToken(client);

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
