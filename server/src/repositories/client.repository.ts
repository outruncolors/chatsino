import knex from "knex";
import * as config from "config";
import { ChatsinoLogger } from "logging";
import { CacheService } from "services";

export type ClientPermissionLevel =
  | "visitor"
  | "user"
  | "admin:limited"
  | "admin:unlimited";

export interface Client {
  id: string;
  username: string;
  permissionLevel: ClientPermissionLevel;
  hash: string;
  salt: string;
}

export class ClientRepository {
  private logger = new ChatsinoLogger(this.constructor.name);
  private cacheService = new CacheService();

  private database = knex({
    client: "pg",
    connection: config.POSTGRES_CONNECTION_STRING,
    searchPath: ["knex", "public"],
  });

  public constructor() {
    this.initialize();
  }

  public async getClientByUsername(username: string) {
    this.logger.info({ username }, "Retrieving user.");

    const cachedClient = (await this.cacheService.getValue(username)) as Client;

    if (cachedClient) {
      this.logger.info({ username }, "Retrieved cached user.");

      return cachedClient;
    } else {
      this.logger.info(
        { username },
        "User not in cache; retrieving from database."
      );

      const client = await this.database<Client>("clients")
        .where("username", username)
        .first();

      if (client) {
        const { hash: _, salt: __, ...rest } = client;
        this.cacheService.setValue(
          username,
          JSON.stringify(rest),
          config.CLIENT_CACHE_TTL
        );

        return client;
      } else {
        this.logger.error({ username }, "User not in database.");
      }
    }
  }

  public async createClient(
    username: string,
    hash: string,
    salt: string,
    permissionLevel: ClientPermissionLevel
  ) {
    try {
      this.logger.info({ username, permissionLevel }, "Creating a Client.");

      await this.database<Client>("clients").insert({
        username,
        hash,
        salt,
        permissionLevel,
      });

      this.logger.info("Successfully created a Client.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Failed to create Client.");

        throw error;
      }
    }
  }

  public async initialize() {
    try {
      this.logger.info("Initializing Client repository.");
      await this.createTable();
      this.logger.info("Client repository successfully initialized.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to initialize Client repository."
        );

        throw error;
      }
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
        table.enu("permissionLevel", [
          "visitor",
          "user",
          "admin:limited",
          "admin:unlimited",
        ] as ClientPermissionLevel[]);
        table.specificType("hash", `CHAR(120) DEFAULT NULL`);
        table.specificType("salt", `CHAR(256) DEFAULT NULL`);
        table.timestamps();
      });

      this.logger.info(`Successfully created table "clients".`);
    }
  }
}
