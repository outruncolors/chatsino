import knex from "knex";
import * as config from "config";
import { ChatsinoLogger } from "logging";

export interface Client {
  id: string;
  username: string;
  passwordHash: string;
}

export class ClientRepository {
  public static instance = new ClientRepository();

  private logger = ChatsinoLogger.instance;

  private connection = knex({
    client: "pg",
    connection: config.POSTGRES_CONNECTION_STRING,
    searchPath: ["knex", "public"],
  });

  public async getClientByUsername(username: string) {
    return this.connection<Client>("clients")
      .where("username", username)
      .first();
  }

  public async initialize() {
    try {
      this.logger.info("Initializing Client repository.");

      await this.createTable();

      this.logger.info("Client repository successfully initialized.");
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to initialize Client repository."
      );
    }
  }

  private async createTable() {
    const hasTable = await this.connection.schema.hasTable("clients");

    if (hasTable) {
      this.logger.info(`Table "clients" already exists.`);
    } else {
      this.logger.info(`Creating table "clients".`);

      await this.connection.schema.createTable("clients", (table) => {
        table.increments();
        table.string("username");
        table.specificType("passwordHash", "CHAR(60) DEFAULT NULL");
        table.timestamps();
      });

      this.logger.info(`Successfully created table "clients".`);
    }
  }
}
