import { ChatsinoLogger } from "logging";
import { database } from "./common";
import type { BlackjackGame, BlackjackState } from "games";

export interface Blackjack {
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
    this.logger.info({ clientId }, "Retrieving active blackjack game.");

    const game = await database<Blackjack>("blackjack")
      .where("clientId", clientId)
      .where("active", true)
      .first();

    return game || null;
  }

  public async setActiveBlackjackGame(
    clientId: number,
    gameData: Partial<Blackjack>
  ) {
    this.logger.info({ clientId }, "Updating an active blackjack game.");

    await database<Blackjack>("blackjack")
      .where("clientId", clientId)
      .where("active", true)
      .update(gameData);
  }

  public async createBlackjackGame(
    clientId: number,
    wager: number,
    state: BlackjackState
  ) {
    try {
      this.logger.info({ clientId }, "Creating a blackjack game.");

      await database<Blackjack>("blackjack").insert({
        clientId,
        wager,
        state,
        winnings: 0,
      });

      this.logger.info("Successfully created a blackjack game.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to create blackjack game."
        );

        throw error;
      }
    }
  }

  public create() {
    return this.initialize();
  }

  public destroy() {
    return this.dropTable();
  }

  private async initialize() {
    try {
      this.logger.info("Initializing blackjack repository.");

      await this.createTable();

      this.logger.info("Blackjack repository successfully initialized.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to initialize blackjack repository."
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
        table.increments("id", { primaryKey: true });
        table.integer("clientId").references("clients.id").notNullable();
        table.boolean("active").defaultTo(true).notNullable();
        table.jsonb("state");
        table.integer("wager").defaultTo(0).notNullable();
        table.integer("winnings").defaultTo(0).notNullable();
        table.timestamps(true);
      });

      this.logger.info(`Successfully created table "blackjack".`);
    }
  }

  private dropTable() {
    this.logger.info(`Dropping table "blackjack".`);
    return database.schema.dropTableIfExists("blackjack");
  }
}
