import { ChatsinoLogger } from "logging";
import { BlackjackGame, BlackjackState } from "games";
import { database } from "./common";

interface Blackjack {
  clientId: number;
  active: boolean;
  state: BlackjackState;
  wager: number;
  winnings: number;
}

let initializingBlackjackRepository = false;

export class BlackjackRepository {
  private logger = new ChatsinoLogger(this.constructor.name);

  public constructor() {
    if (!initializingBlackjackRepository) {
      initializingBlackjackRepository = true;
      this.initialize();
    }
  }

  public async getActiveBlackjackGame(clientId: number) {
    this.logger.info({ clientId }, "Retrieving active Blackjack Game.");

    const game = await database<Blackjack>("blackjack")
      .where("clientId", clientId)
      .where("active", true)
      .first();

    return game || null;
  }

  public async createBlackjackGame(
    clientId: number,
    wager: number,
    winnings: number
  ) {
    try {
      this.logger.info({ clientId }, "Creating a Blackjack Game.");

      await database<Blackjack>("blackjack").insert({
        clientId,
        wager,
        winnings,
      });

      this.logger.info("Successfully created a Blackjack Game.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to create Blackjack Game."
        );

        throw error;
      }
    }
  }

  private async initialize() {
    try {
      this.logger.info("Initializing Blackjack repository.");

      await this.createTable();

      this.logger.info("Blackjack repository successfully initialized.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to initialize Blackjack repository."
        );

        throw error;
      }
    }
  }

  private async createTable() {
    const hasTable = await database.schema.hasTable("blackjack");

    if (hasTable) {
      this.logger.info(`Table "blackjack" already exists.`);
    } else {
      this.logger.info(`Creating table "blackjack".`);

      await database.schema.createTable("blackjack", (table) => {
        table.increments();
        table.integer("clientId").references("clients.id").notNullable();
        table.boolean("active").defaultTo(true).notNullable();
        table
          .jsonb("state")
          .defaultTo(new BlackjackGame().serialize())
          .notNullable();
        table.integer("wager").defaultTo(0).notNullable();
        table.integer("winnings").defaultTo(0).notNullable();
        table.timestamps();
      });

      this.logger.info(`Successfully created table "blackjack".`);
    }
  }
}
