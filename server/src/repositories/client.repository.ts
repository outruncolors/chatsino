import { BaseRepository } from "./base.repository";
import { CacheService } from "services";
import * as config from "config";
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

async function createClientTable() {
  const exists = await database.schema.hasTable("clients");

  if (!exists) {
    return database.schema.createTable("clients", (table) => {
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
      table.timestamps(true, true, true);
    });
  }
}

export class ClientRepository extends BaseRepository {
  private cacheService = new CacheService();

  public static safetify(client: Client) {
    const { hash: _, salt: __, ...safeClient } = client;
    return safeClient;
  }

  public constructor() {
    super("clients", createClientTable);
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
      this.logger.info({ username, permissionLevel }, "Creating a client.");

      await database<Client>("clients").insert({
        username,
        hash,
        salt,
        permissionLevel,
      });

      this.logger.info("Successfully created a client.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Failed to create client.");

        throw error;
      }
    }
  }

  public async payClient(clientId: number, amount: number) {
    try {
      this.logger.info({ clientId, amount }, "Paying a client.");

      await database<Client>("clients")
        .where("id", clientId)
        .increment("chips", amount);

      this.logger.info("Paid a client.");

      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Unable to pay a client.");
      }

      return false;
    }
  }

  public async chargeClient(clientId: number, amount: number) {
    try {
      this.logger.info({ clientId, amount }, "Charging a client.");

      const canAfford = await this.canClientAfford(clientId, amount);

      if (!canAfford) {
        throw new CannotAffordError();
      }

      await database<Client>("clients")
        .where("id", clientId)
        .decrement("chips", amount);

      this.logger.info("Charged a client.");

      return true;
    } catch (error) {
      if (error instanceof CannotAffordError) {
        this.logger.error("Client cannot afford charge.");
      }

      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to charge a client."
        );
      }

      return false;
    }
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

  public async changeClientPermissionLevel(
    clientId: number,
    permissionLevel: ClientPermissionLevel
  ) {
    try {
      this.logger.info(
        { clientId, permissionLevel },
        "Changing a client's permission level."
      );

      await database<Client>("clients").where("id", clientId).update({
        permissionLevel,
      });

      this.logger.info("Changed a client's permission level.");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to change a client's permission level."
        );
      }

      throw error;
    }
  }
}

export class CannotAffordError extends Error {}
