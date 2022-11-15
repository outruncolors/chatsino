import { BlackjackAction, NoGameInProgressError } from "games";
import { CannotAffordWagerError, meetsPermissionRequirement } from "helpers";
import { ClientPermissionLevel } from "repositories";
import { BlackjackService } from "services";
import { RouletteService } from "services/roulette.service";
import { SourcedSocketMessageSchema, sourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import * as yup from "yup";
import { RequiredObjectSchema } from "yup/lib/object";
import { BaseSocketController, subscriber } from "./socket.controller.base";

export class SocketController extends BaseSocketController {
  private blackjackService = new BlackjackService();
  private rouletteService = new RouletteService();

  public messageHandlers: Record<
    string,
    {
      schema: RequiredObjectSchema<any, any, any>;
      handler: (message: SourcedSocketMessageSchema) => unknown;
      requirement?: ClientPermissionLevel;
    }
  > = {
    getActiveBlackjackGame: {
      schema: GetActiveBlackjackGameSchema,
      handler: this.handleGetActiveBlackjackGame.bind(this),
    },
    startBlackjackGame: {
      schema: StartBlackjackGameActionSchema,
      handler: this.handleStartBlackjackGame.bind(this),
    },
    takeBlackjackAction: {
      schema: TakeBlackjackActionSchema,
      handler: this.handleTakeBlackjackAction.bind(this),
    },
  };

  public constructor(wss: WebSocketServer) {
    super(wss);

    subscriber.subscribe("client-message", this.handleSubscribedMessage);

    this.rouletteService.start();
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
    this.logger.info({ kind, args, from }, "Handling getActiveBlackjackGame()");

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
    this.logger.info({ kind, args, from }, "Handling startBlackjackGame()");

    const [wager] = args as [number];

    try {
      await this.messageHandlers.startBlackjackGame.schema.validate({
        wager,
      });
    } catch {
      throw new InvalidArgumentsError();
    }

    await this.blackjackService.start(from.id, wager);

    try {
      const succeeded = await this.attempt({ kind, args, from }, async () =>
        this.sendMessageTo(from.id, {
          kind,
          data: (await this.blackjackService.load(from.id)).data,
        })
      );

      this.logger.info({ succeeded }, "Handled.");
    } catch (error) {
      if (error instanceof CannotAffordWagerError) {
        return this.sendMessageTo(from.id, {
          kind,
          error: `Cannot afford to wager ${wager} chips.`,
        });
      }

      if (error instanceof Error) {
        return this.sendMessageTo(from.id, {
          kind,
          error: "An unknown error occurred.",
        });
      }
    }
  }

  private async handleTakeBlackjackAction({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) {
    this.logger.info(
      { kind, args, from },
      "Handling handleTakeBlackjackAction()"
    );

    const [action] = args as [BlackjackAction];

    try {
      await this.messageHandlers.takeBlackjackAction.schema.validate({
        action,
      });
    } catch {
      throw new InvalidArgumentsError();
    }

    const succeeded = await this.attempt({ kind, args, from }, async () =>
      this.sendMessageTo(from.id, {
        kind,
        data: await this.blackjackService.play(from.id, action),
      })
    );

    this.logger.info({ succeeded }, "Handled.");
  }

  private async attempt(
    { kind, args, from }: SourcedSocketMessageSchema,
    fn: () => Promise<unknown>
  ) {
    try {
      await fn();
      return true;
    } catch (error) {
      if (error instanceof InvalidArgumentsError) {
        this.sendMessageTo(from.id, {
          kind,
          args,
          error: `Invalid arguments provided to ${kind}.`,
        });

        return false;
      }

      if (error instanceof NoGameInProgressError) {
        this.sendMessageTo(from.id, {
          kind,
          args,
          error: `${from.id} has no game in progress.`,
        });

        return false;
      }

      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Failed attempt.");

        throw error;
      }
    }
  }
}

export class UnknownMessageKindError extends Error {}
export class NotPermittedError extends Error {}
export class InvalidArgumentsError extends Error {}

export const GetActiveBlackjackGameSchema = yup
  .object({
    clientId: yup.number().required(),
  })
  .required();

export const StartBlackjackGameActionSchema = yup
  .object({
    wager: yup.number().positive().required(),
  })
  .required();

export const TakeBlackjackActionSchema = yup
  .object({
    action: yup
      .string()
      .oneOf<BlackjackAction>(["hit", "stay", "double-down", "buy-insurance"])
      .required(),
  })
  .required();
