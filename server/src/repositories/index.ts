import knex from "knex";
import * as config from "config";
import { ChatsinoLogger } from "logging";

export class ChatsinoRepository {
  public static instance = new ChatsinoRepository();

  private logger = ChatsinoLogger.instance;

  private connection = knex({
    client: "pg",
    connection: config.POSTGRES_CONNECTION_STRING,
    searchPath: ["knex", "public"],
  });

  public async initialize() {
    try {
      this.logger.info("Initializing repository.");

      await this.createClientsTable();

      this.logger.info("Repository successfully initialized.");
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to initialize repository."
      );
    }
  }

  private async createClientsTable() {
    const hasTable = await this.connection.schema.hasTable("clients");

    if (hasTable) {
      this.logger.info(`Table "clients" already exists.`);
    } else {
      this.logger.info(`Creating table "clients".`);

      await this.connection.schema.createTable("clients", (table) => {
        table.increments();
        table.string("username");
        table.timestamps();
      });

      this.logger.info(`Successfully created table "clients".`);
    }
  }
}
