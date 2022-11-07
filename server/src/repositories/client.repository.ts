import * as config from "config";
import { ChatsinoLogger } from "logging";
import { CacheService } from "services";
import { database } from "./common";

export type ClientPermissionLevel =
  | "visitor"
  | "user"
  | "admin:limited"
  | "admin:unlimited";

export interface Client {
  id: number;
  username: string;
  permissionLevel: ClientPermissionLevel;
  chips: number;
  hash: string;
  salt: string;
}

export type SafeClient = Omit<Client, "hash" | "salt">;

let initializingClientRepository = false;

export class ClientRepository {
  private logger = new ChatsinoLogger(this.constructor.name);
  private cacheService = new CacheService();

  public static safetify(client: Client) {
    const { hash: _, salt: __, ...safeClient } = client;
    return safeClient;
  }

  public constructor() {
    if (!initializingClientRepository) {
      initializingClientRepository = true;
      this.initialize();
    }
  }

  public async getClient(clientId: number) {
    const client = await database<Client>("clients")
      .where("id", clientId)
      .first();

    return client ?? null;
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

      const client = await database<Client>("clients")
        .where("username", username)
        .first();

      if (client) {
        this.cacheService.setValue(
          username,
          JSON.stringify(client),
          config.CLIENT_CACHE_TTL
        );

        return client;
      } else {
        this.logger.error({ username }, "User not in database.");
      }
    }
  }

  public async getChipBalance(clientId: number) {
    const client = await this.getClient(clientId);
    return client?.chips ?? 0;
  }

  public async createClient(
    username: string,
    hash: string,
    salt: string,
    permissionLevel: ClientPermissionLevel
  ) {
    try {
      this.logger.info({ username, permissionLevel }, "Creating a Client.");

      await database<Client>("clients").insert({
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

  public async payClient(clientId: number, amount: number) {
    try {
      await database<Client>("clients")
        .where("id", clientId)
        .increment("chips", amount);

      return true;
    } catch (error) {
      return false;
    }
  }

  public async chargeClient(clientId: number, amount: number) {
    const canAfford = await this.canClientAfford(clientId, amount);

    if (canAfford) {
      await database<Client>("clients")
        .where("id", clientId)
        .decrement("chips", amount);

      return true;
    }

    return false;
  }

  public async canClientAfford(clientId: number, amount: number) {
    try {
      const client = await this.getClient(clientId);

      if (!client || client.chips < amount) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
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
      this.logger.info("Initializing client repository.");

      await this.createTable();

      this.logger.info("Client repository successfully initialized.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to initialize client repository."
        );

        throw error;
      }
    }
  }

  private async createTable() {
    const hasTable = await database.schema.hasTable("clients");

    if (hasTable) {
      this.logger.info(`Table "clients" already exists.`);
    } else {
      this.logger.info(`Creating table "clients".`);

      await database.schema.createTable("clients", (table) => {
        table.increments("id", { primaryKey: true });
        table.string("username").unique().notNullable();
        table
          .enu("permissionLevel", [
            "visitor",
            "user",
            "admin:limited",
            "admin:unlimited",
          ] as ClientPermissionLevel[])
          .defaultTo("user")
          .notNullable();
        table.specificType("hash", `CHAR(120) DEFAULT NULL`);
        table.specificType("salt", `CHAR(256) DEFAULT NULL`);
        table.integer("chips").defaultTo(0);
        table.timestamps(true);
      });

      this.logger.info(`Successfully created table "clients".`);
    }
  }

  private dropTable() {
    this.logger.info(`Dropping table "clients".`);
    return database.schema.dropTableIfExists("clients");
  }
}
