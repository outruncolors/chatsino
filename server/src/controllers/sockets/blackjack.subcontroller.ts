import {
  BlackjackAction,
  GameInProgressError,
  NoGameInProgressError,
} from "games";
import { CannotAffordWagerError } from "helpers";
import { ChatsinoLogger } from "logging";
import { BlackjackService } from "services";
import * as yup from "yup";
import { BaseSubcontroller } from "./base.subcontroller";
import { subscriber } from "./base.socket.controller";

export enum BlackjackSocketMessages {
  GetActiveBlackjackGame = "getActiveBlackjackGame",
  StartBlackjackGame = "startBlackjackGame",
  TakeBlackjackAction = "takeBlackjackAction",
}

export class BlackjackSubcontroller extends BaseSubcontroller {
  private logger = new ChatsinoLogger(this.constructor.name);
  private blackjackService = new BlackjackService();

  public initialize() {
    this.logger.info("Initializing subscriptions.");

    subscriber.subscribe(
      BlackjackSocketMessages.GetActiveBlackjackGame,
      this.handleGetActiveBlackjackGame
    );
    subscriber.subscribe(
      BlackjackSocketMessages.StartBlackjackGame,
      this.handleStartBlackjackGame
    );
    subscriber.subscribe(
      BlackjackSocketMessages.TakeBlackjackAction,
      this.handleTakeBlackjackAction
    );
  }

  private handleGetActiveBlackjackGame = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.GetActiveBlackjackGame
    );

    try {
      const { clientId } = await GetActiveBlackjackGameSchema.validate(args);

      return this.sendSuccessResponse(
        from.id,
        kind,
        (await this.blackjackService.load(clientId)).data
      );
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to get active blackjack game."
      );
    }
  };

  private handleStartBlackjackGame = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.StartBlackjackGame
    );

    try {
      const { wager } = await StartBlackjackGameActionSchema.validate(args);

      await this.blackjackService.start(from.id, wager);

      return this.sendSuccessResponse(
        from.id,
        kind,
        (await this.blackjackService.load(from.id)).data
      );
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to start a blackjack game."
      );
    }
  };

  private handleTakeBlackjackAction = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info(
      { kind, args, from },
      BlackjackSocketMessages.TakeBlackjackAction
    );

    try {
      const { action } = await TakeBlackjackActionSchema.validate(args);
      const blackjackAction = action as BlackjackAction;

      return this.sendSuccessResponse(
        from.id,
        kind,
        await this.blackjackService.play(from.id, blackjackAction)
      );
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to take that blackjack action."
      );
    }
  };

  private handleErrors(
    to: number,
    kind: string,
    error: unknown,
    fallback: string
  ) {
    const sendError = (message: string) =>
      this.sendErrorResponse(to, kind, message);

    if (error instanceof GameInProgressError) {
      return sendError("You already have a blackjack game in progress.");
    }

    if (error instanceof NoGameInProgressError) {
      return sendError("You do not have a game of blackjack in progress.");
    }

    if (error instanceof CannotAffordWagerError) {
      return sendError("Cannot afford to wager that many chips.");
    }

    if (error instanceof yup.ValidationError) {
      return sendError("Validation errors detected.");
    }

    if (error instanceof Error) {
      return sendError(fallback);
    }
  }
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
