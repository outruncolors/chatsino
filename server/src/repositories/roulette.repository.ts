import { BaseRepository } from "./base.repository";
import { database } from "./common";
import type { RouletteState } from "games";

export interface Roulette {
  active: boolean;
  state: RouletteState;
  paidOut: boolean;
}

async function createRouletteTable() {
  const exists = await database.schema.hasTable("roulette");

  if (!exists) {
    return database.schema.createTable("roulette", (table) => {
      table.increments("id", { primaryKey: true });
      table.boolean("active").defaultTo(true).notNullable();
      table.jsonb("state");
      table.boolean("paidOut").defaultTo(false).notNullable();
      table.timestamps(true, true, true);
    });
  }
}

export class RouletteRepository extends BaseRepository {
  constructor() {
    super("roulette", createRouletteTable);
  }

  public async getActiveRouletteGame() {
    this.logger.info("Retrieving active roulette game.");

    const game = await database<Roulette>("roulette")
      .where("active", true)
      .first();

    return game || null;
  }

  public async setActiveRouletteGame(game: Partial<Roulette>) {
    this.logger.info("Updating active roulette game.");

    await database<Roulette>("roulette").where("active", true).update(game);
  }

  public async createRouletteGame(state: RouletteState) {
    try {
      this.logger.info({ state }, "Creating a roulette game.");

      await database<Roulette>("roulette").insert({
        active: true,
        state,
      });

      this.logger.info("Successfully created a roulette game.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to create roulette game."
        );

        throw error;
      }
    }
  }
}
