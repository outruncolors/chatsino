import { BaseRepository } from "./base.repository";
import { database } from "./common";
import type { BlackjackState } from "games";

export interface Blackjack {
  clientId: number;
  active: boolean;
  state: BlackjackState;
  wager: number;
  winnings: number;
}

async function createBlackjackTable() {
  const exists = await database.schema.hasTable("blackjack");

  if (!exists) {
    return database.schema.createTable("blackjack", (table) => {
      table.increments("id", { primaryKey: true });
      table.integer("clientId").references("clients.id").notNullable();
      table.boolean("active").defaultTo(true).notNullable();
      table.jsonb("state");
      table.integer("wager").defaultTo(0).notNullable();
      table.integer("winnings").defaultTo(0).notNullable();
      table.timestamps(true, true, true);
    });
  }
}

export class BlackjackRepository extends BaseRepository {
  constructor() {
    super("blackjack", createBlackjackTable);
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
}
