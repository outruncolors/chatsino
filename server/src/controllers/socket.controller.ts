import { GameInProgressError } from "games";
import { meetsPermissionRequirement } from "helpers";
import { ClientPermissionLevel } from "repositories";
import { BlackjackService, CannotAffordWagerError } from "services";
import { SourcedSocketMessageSchema, sourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import * as yup from "yup";
import { RequiredObjectSchema } from "yup/lib/object";
import { BaseSocketController, subscriber } from "./socket.controller.base";

export class SocketController extends BaseSocketController {
  private blackjackService = new BlackjackService();

  public messageHandlers: Record<
    string,
    {
      schema: RequiredObjectSchema<any, any, any>;
      handler: (message: SourcedSocketMessageSchema) => unknown;
      requirement?: ClientPermissionLevel;
    }
  > = {
    getActiveBlackjackGame: {
      schema: yup
        .object({
          clientId: yup.number().required(),
        })
        .required(),
      handler: this.handleGetActiveBlackjackGame.bind(this),
    },
    startBlackjackGame: {
      schema: yup
        .object({
          wager: yup.number().positive().required(),
        })
        .required(),
      handler: this.handleStartBlackjackGame.bind(this),
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

  private async handleGetActiveBlackjackGame({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) {
    this.logger.info({ kind, args, from }, "Handling getActiveBlackjackGame");

    const [clientId] = args as [number];

    try {
      await this.messageHandlers.getActiveBlackjackGame.schema.validate({
        clientId,
      });
    } catch {
      throw new InvalidArgumentsError();
    }

    const { data } = await this.blackjackService.load(clientId);

    this.sendMessageTo(from.id, { kind, data });
  }

  private async handleStartBlackjackGame({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) {
    this.logger.info({ kind, args, from }, "Handling getActiveBlackjackGame");

    const [wager] = args as [number];

    try {
      await this.messageHandlers.startBlackjackGame.schema.validate({
        wager,
      });
    } catch {
      throw new InvalidArgumentsError();
    }

    try {
      this.sendMessageTo(from.id, {
        kind,
        data: await this.blackjackService.start(from.id, wager),
      });
    } catch (error) {
      if (error instanceof InvalidArgumentsError) {
        return this.sendMessageTo(from.id, {
          kind,
          error: `Invalid arguments provided to ${kind}.`,
        });
      }

      if (error instanceof CannotAffordWagerError) {
        return this.sendMessageTo(from.id, {
          kind,
          error: `Cannot afford to wager ${wager} chips.`,
        });
      }

      if (error instanceof GameInProgressError) {
        return this.sendMessageTo(from.id, {
          kind,
          error: "You already have a game of blackjack in progress.",
        });
      }

      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to startBlackjackGame()"
        );

        return this.sendMessageTo(from.id, {
          kind,
          error: "An unknown error occurred.",
        });
      }
    }
  }
}

export class UnknownMessageKindError extends Error {}
export class NotPermittedError extends Error {}
export class InvalidArgumentsError extends Error {}
