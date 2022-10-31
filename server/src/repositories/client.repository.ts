import knex from "knex";
import * as config from "config";
import { ChatsinoLogger } from "logging";

export interface Client {
  id: string;
  username: string;
  hash: string;
  salt: string;
}

export class ClientRepository {
  public static instance = new ClientRepository();

  private logger = new ChatsinoLogger(this.constructor.name);

  private database = knex({
    client: "pg",
    connection: config.POSTGRES_CONNECTION_STRING,
    searchPath: ["knex", "public"],
  });

  public constructor() {
    this.initialize();
  }

  public async getClientByUsername(username: string) {
    return this.database<Client>("clients").where("username", username).first();
  }

  public async createClient(username: string, hash: string, salt: string) {
    try {
      this.logger.info({ username, hash, salt }, "Creating a Client.");

      await this.database<Client>("clients").insert({
        username,
        hash,
        salt,
      });

      this.logger.info("Successfully created a Client.");
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to create Client."
      );

      throw error;
    }
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

      throw error;
    }
  }

  private async createTable() {
    const hasTable = await this.database.schema.hasTable("clients");

    if (hasTable) {
      this.logger.info(`Table "clients" already exists.`);
    } else {
      this.logger.info(`Creating table "clients".`);

      await this.database.schema.createTable("clients", (table) => {
        table.increments();
        table.string("username").unique();
        table.specificType("hash", `CHAR(120) DEFAULT NULL`);
        table.specificType("salt", `CHAR(256) DEFAULT NULL`);
        table.timestamps();
      });

      this.logger.info(`Successfully created table "clients".`);
    }
  }
}
