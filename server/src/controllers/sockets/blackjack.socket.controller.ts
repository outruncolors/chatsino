import { BlackjackAction } from "games";
import { CannotAffordWagerError } from "helpers";
import { BlackjackService } from "services";
import { SourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import * as yup from "yup";
import { SocketController } from "./socket.controller";

export enum BlackjackSocketMessages {
  GetActiveBlackjackGame = "getActiveBlackjackGame",
  StartBlackjackGame = "startBlackjackGame",
  TakeBlackjackAction = "takeBlackjackAction",
}

export class BlackjackSocketController extends SocketController {
  private blackjackService = new BlackjackService();

  public constructor(wss: WebSocketServer) {
    super(wss);

    this.addMessageHandler(BlackjackSocketMessages.GetActiveBlackjackGame, {
      schema: GetActiveBlackjackGameSchema,
      handler: this.handleGetActiveBlackjackGame,
    });
    this.addMessageHandler(BlackjackSocketMessages.StartBlackjackGame, {
      handler: this.handleStartBlackjackGame,
    });
    this.addMessageHandler(BlackjackSocketMessages.TakeBlackjackAction, {
      schema: TakeBlackjackActionSchema,
      handler: this.handleTakeBlackjackAction,
    });
  }

  private handleGetActiveBlackjackGame = async ({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) => {
    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.GetActiveBlackjackGame
    );

    const { data } = await this.blackjackService.load(args.clientId as number);

    this.sendMessageTo(from.id, { kind, data });
  };

  private handleStartBlackjackGame = async ({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) => {
    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.StartBlackjackGame
    );
    const wager = args.wager as number;

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

      throw error;
    }
  };

  private handleTakeBlackjackAction = async ({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) => {
    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.TakeBlackjackAction
    );

    const succeeded = await this.attempt({ kind, args, from }, async () =>
      this.sendMessageTo(from.id, {
        kind,
        data: await this.blackjackService.play(
          from.id,
          args.action as BlackjackAction
        ),
      })
    );

    this.logger.info({ succeeded }, "Handled.");
  };
}

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
