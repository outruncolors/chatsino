import {
  BlackjackAction,
  BlackjackGame,
  FinishedBlackjackStatus,
  GameInProgressError,
  NoGameInProgressError,
  CannotTakeActionError,
} from "games";
import { ChatsinoLogger } from "logging";
import { Blackjack, BlackjackRepository, ClientRepository } from "repositories";

export class BlackjackService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private blackjackRepository = new BlackjackRepository();
  private clientRepository = new ClientRepository();

  public save(clientId: number, game: Partial<Blackjack>) {
    return this.blackjackRepository.setActiveBlackjackGame(clientId, game);
  }

  public async load(clientId: number) {
    const data = await this.blackjackRepository.getActiveBlackjackGame(
      clientId
    );

    return {
      data,
      game: data ? new BlackjackGame().deserialize(data.state) : null,
    };
  }

  public async start(clientId: number, wager: number) {
    const existingActiveGame = await this.load(clientId);

    if (existingActiveGame) {
      throw new GameInProgressError();
    }

    const chargedForGame = await this.clientRepository.chargeClient(
      clientId,
      wager
    );

    if (!chargedForGame) {
      throw new CannotAffordWagerError();
    }

    const game = new BlackjackGame();

    game.deal();

    const gameState = game.serialize();

    await this.blackjackRepository.createBlackjackGame(
      clientId,
      wager,
      gameState
    );

    return gameState;
  }

  public async play(clientId: number, action: BlackjackAction) {
    const { data, game } = await this.load(clientId);

    if (!data || !game) {
      throw new NoGameInProgressError();
    }

    try {
      switch (action) {
        case "deal":
          throw new GameInProgressError();
        case "hit":
          game.hit();
          break;
        case "stay":
          game.stay();
          break;
        case "double-down":
          game.doubleDown();
          break;
        case "buy-insurance":
          game.buyInsurance();
          break;
      }

      if (game.status !== "playing") {
        await this.payout(data);
      }

      data.state = game.serialize();

      await this.save(clientId, data);

      return data.state;
    } catch (error) {
      if (error instanceof GameInProgressError) {
        this.logger.info({ clientId }, "Client has a game in progress.");
      }

      if (error instanceof NoGameInProgressError) {
        this.logger.info(
          { clientId },
          "Client does not have a game in progress."
        );
      }

      if (error instanceof CannotTakeActionError) {
        this.logger.info(
          { clientId, action, state: data.state },
          "Client cannot take that action."
        );
      }

      if (error instanceof Error) {
        this.logger.info({ error: error.message }, "Unknown error occurred.");
      }

      throw error;
    }
  }

  private async payout(gameData: Blackjack) {
    if (!gameData.active) {
      throw new CannotPayoutError();
    }

    const game = new BlackjackGame();
    game.deserialize(gameData.state);

    let payout = 0;
    const handlers: Record<FinishedBlackjackStatus, () => void> = {
      lost: () => {
        if (game.insuranceApplies && game.playerBoughtInsurance) {
          gameData.winnings = 0;
          payout = gameData.wager;
        } else {
          gameData.winnings = -gameData.wager;
          payout = 0;
        }
      },
      pushed: () => {
        gameData.winnings = 0;
        payout = gameData.wager;
      },
      won: () => {
        gameData.winnings = gameData.wager;
        payout = gameData.wager * 2;
      },
      blackjack: () => {
        gameData.winnings = Math.floor((gameData.wager * 3) / 2);
        payout = gameData.wager + gameData.winnings;
      },
    };
    const handler =
      handlers[gameData.state.status as FinishedBlackjackStatus] ??
      (() => {
        throw new CannotPayoutError();
      });

    handler();

    if (payout > 0) {
      await this.clientRepository.payClient(gameData.clientId, payout);
    }

    gameData.active = false;
  }
}

export class CannotAffordWagerError extends Error {}
export class CannotPayoutError extends Error {}
