import { Request } from "express";
import { Server } from "https";
import { Duplex } from "stream";
import { ChatsinoLogger } from "logging";
import { SocketController } from "./socket.controller";
import * as config from "config";

export class HttpsController {
  private logger = new ChatsinoLogger(this.constructor.name);
  private server: Server;
  private socketController: SocketController;

  public constructor(server: Server, socketController: SocketController) {
    server.on("upgrade", this.handleUpgrade);
    server.on("close", this.handleClose);

    this.server = server;
    this.socketController = socketController;
  }

  public listen = () =>
    this.server.listen(config.PORT, () =>
      this.logger.info({ port: config.PORT }, "Server is listening.")
    );

  public shutdown = () => this.handleClose();

  private handleUpgrade = async (
    request: Request,
    socket: Duplex,
    head: Buffer
  ) => {
    try {
      this.logger.info(
        "Attempting to upgrade a connection from HTTP to WebSockets"
      );

      this.socketController.add(request, socket, head);

      this.logger.info(
        "Successfully upgraded a connection from HTTP to WebSockets"
      );
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Unable to upgrade a connection from HTTP to WebSockets"
      );
    }
  };

  private handleClose = () => {
    this.logger.info("HttpsController is shutting down.");
    this.server.closeAllConnections();
  };
}
