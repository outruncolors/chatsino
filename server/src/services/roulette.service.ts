import {
  GameInProgressError,
  NoGameInProgressError,
  RouletteGame,
} from "games";
import { ChatsinoLogger } from "logging";
import { RouletteBet } from "games";
import {
  CannotPayoutError,
  CannotAffordWagerError,
  DifferentClientError,
} from "helpers";
import { ClientRepository, Roulette, RouletteRepository } from "repositories";

export class RouletteService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private rouletteRepository = new RouletteRepository();
  private clientRepository = new ClientRepository();

  public save(game: Partial<Roulette>) {
    return this.rouletteRepository.setActiveRouletteGame(game);
  }

  public async load() {
    const data = await this.rouletteRepository.getActiveRouletteGame();

    return {
      data,
      game: data ? new RouletteGame().deserialize(data.state) : null,
    };
  }

  public async start() {
    const { data: existingActiveGame } = await this.load();

    if (existingActiveGame) {
      throw new GameInProgressError();
    }

    const game = new RouletteGame();

    game.startTakingBets();

    const gameState = game.serialize();

    return this.rouletteRepository.createRouletteGame(gameState);
  }

  public async play(clientId: number, bet: RouletteBet) {
    if (clientId !== bet.clientId) {
      throw new DifferentClientError();
    }

    const { data, game } = await this.load();

    if (!data || !game) {
      throw new NoGameInProgressError();
    }

    if (game.status !== "taking-bets") {
      throw new NotTakingBetsError();
    }

    const chargedForGame = await this.clientRepository.chargeClient(
      clientId,
      bet.wager
    );

    if (!chargedForGame) {
      throw new CannotAffordWagerError();
    }

    try {
      game.takeBet(bet);

      data.state = game.serialize();

      await this.save(data);

      return data;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to place a roulette bet. Refunding client."
        );

        await this.clientRepository.payClient(clientId, bet.wager);
      }

      throw error;
    }
  }

  private async payout() {
    const { data, game } = await this.load();

    if (!data?.active || !game) {
      throw new CannotPayoutError();
    }

    if (data.paidOut) {
      throw new AlreadyPaidOutError();
    }

    try {
      game.spin();

      const winners = game.winners ?? {};

      await Promise.all(
        Object.entries(winners).map(([stringClientId, winnings]) => {
          const clientId = parseInt(stringClientId);
          this.clientRepository.payClient(clientId, winnings);
        })
      );

      data.active = false;
      data.paidOut = true;

      return data;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.info({ error: error.message }, "Unable to payout()");
      }

      throw error;
    }
  }
}

export class NotTakingBetsError extends Error {}
export class AlreadyPaidOutError extends Error {}
export class UnableToSpinError extends Error {}
