import querystring from "node:querystring";
import { Request } from "express";
import { Duplex } from "stream";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { ChatsinoLogger } from "logging";
import { TicketService } from "services";
import * as config from "config";
import { SafeClient } from "repositories";

export class SocketController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private ticketService = new TicketService();
  private socketToClientMap = new Map<WebSocket, SafeClient>();
  private socketToAliveMap = new Map<WebSocket, boolean>();
  private wss: WebSocketServer;
  private checkingForDeadConnections: NodeJS.Timeout;

  public constructor(wss: WebSocketServer) {
    wss.on("close", this.handleServerClose);
    wss.on("connection", this.handleConnection);
    wss.on("error", this.handleServerError);

    this.wss = wss;
    this.checkingForDeadConnections = this.checkForDeadConnections();
  }

  public shutdown = () => this.handleServerClose();

  public initializeSocket = async (
    request: Request,
    socket: Duplex,
    head: Buffer
  ) => {
    this.logger.info("A client is attempting to connect.");

    const { "/?ticket": ticketQueryParam } = querystring.parse(request.url);
    const ticket = ticketQueryParam as string;
    const deny = () => {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    };

    if (!ticket) {
      this.logger.error("Missing ticket.");
      return deny();
    }

    const {
      socket: { remoteAddress },
    } = request;

    if (!remoteAddress) {
      return deny();
    }

    const client = await this.ticketService.validateTicket(
      ticket,
      remoteAddress
    );

    if (!client) {
      return deny();
    }

    const ws = await new Promise<WebSocket>((resolve) =>
      this.wss.handleUpgrade(request, socket, head, resolve)
    );

    this.socketToClientMap.set(ws, client);
    this.socketToAliveMap.set(ws, true);

    this.logger.info("Client successfully authenticated.");

    this.wss.emit("connection", ws, request);
  };

  private handleServerClose = () => {
    this.logger.info("SocketController is shutting down.");

    if (this.checkingForDeadConnections) {
      clearTimeout(this.checkingForDeadConnections);
    }
  };

  private handleConnection = async (ws: WebSocket) => {
    try {
      this.logger.info("A client is attempting to connect.");

      ws.on("message", (data) => this.handleClientMessage(ws, data));
      ws.on("close", () => this.handleClientClose(ws));
      ws.on("error", () => this.handleClientError(ws));
      ws.on("pong", () => this.handleClientPong(ws));
      ws.on("unexpected-response", () =>
        this.handleClientUnexpectedResponse(ws)
      );

      this.logger.info(
        {
          client: this.socketToClientMap.get(ws),
          "clients connected": this.socketToClientMap.size,
        },
        "Client successfully connected."
      );

      ws.send("hi");
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
              { client: this.socketToClientMap.get(ws) },
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
        { client: this.socketToClientMap.get(ws), message },
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
        client: this.socketToClientMap.get(ws),
      },
      "Client experienced an error."
    );

    // Handle.
  };

  private handleClientUnexpectedResponse = (ws: WebSocket) => {
    this.logger.error(
      {
        client: this.socketToClientMap.get(ws),
      },
      "Client experienced an unexpected response."
    );

    // Handle.
  };

  private handleClientClose = (ws: WebSocket) => {
    this.socketToClientMap.delete(ws);

    this.logger.info(
      {
        client: this.socketToClientMap.get(ws),
        "clients connected": this.socketToClientMap.size,
      },
      "Client disconnected."
    );
  };

  private verifyClient = async (ws: WebSocket) => {
    if (!this.socketToClientMap.has(ws)) {
      this.logger.error("Failed to verify a client.");
      throw new Error("Unable to verify client.");
    }
  };
}
