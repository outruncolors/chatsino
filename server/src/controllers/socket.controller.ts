import { meetsPermissionRequirement } from "helpers";
import { ClientPermissionLevel } from "repositories";
import { BlackjackService } from "services";
import { SourcedSocketMessageSchema, sourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import { BaseSocketController, subscriber } from "./socket.controller.base";

export class SocketController extends BaseSocketController {
  private blackjackService = new BlackjackService();

  public messageHandlers: Record<
    string,
    {
      handler: (message: SourcedSocketMessageSchema) => unknown;
      requirement?: ClientPermissionLevel;
    }
  > = {
    getActiveBlackjackGame: {
      handler: async ({ kind, args, from }) => {
        this.logger.info(
          { kind, args, from },
          "Handling getActiveBlackjackGame"
        );

        const [clientId] = args as [number];
        const { data, game } = await this.blackjackService.load(clientId);

        this.sendMessageTo(from.id, { kind, data, game });
      },
    },
  };

  public constructor(wss: WebSocketServer) {
    super(wss);

    subscriber.subscribe("client-message", this.handleSubscribedMessage);
  }

  private handleSubscribedMessage = async (messageString: string) => {
    try {
      const message = JSON.parse(messageString);

      this.logger.info({ message }, "Attempting to handle subscribed message.");

      const { kind, args, from } = (await sourcedSocketMessageSchema.validate(
        message
      )) as SourcedSocketMessageSchema;
      const messageHandler = this.messageHandlers[kind];

      if (!messageHandler) {
        throw new UnknownMessageKindError();
      }

      const { handler, requirement = "user" } = messageHandler;

      if (!meetsPermissionRequirement(requirement, from.permissionLevel)) {
        throw new NotPermittedError();
      }

      await handler({ kind, args, from });

      this.logger.info("Successfully handled subscribed message.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to handle subscribed message."
        );
      }
    }
  };
}

export class UnknownMessageKindError extends Error {}
export class NotPermittedError extends Error {}
