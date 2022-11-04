import { createClient } from "redis";
import JWTRedis from "jwt-redis";
import { ChatsinoLogger } from "logging";
import * as config from "config";
import { now } from "helpers";

let jwtRedis: null | JWTRedis = null;
let initializingJwtRedis = false;

const redisClient = createClient();

export class CacheService {
  private logger = new ChatsinoLogger(this.constructor.name);

  constructor() {
    redisClient.on("error", this.handleRedisError);

    if (!initializingJwtRedis && !jwtRedis) {
      initializingJwtRedis = true;
      this.initializeJwtr();
    }
  }

  // Caching
  public getValue = async (key: string): Promise<unknown> => {
    let value = await redisClient.get(key);

    if (value) {
      try {
        value = JSON.parse(value);
      } catch {}
    }

    return value;
  };

  public setValue = (
    key: string,
    value: number | string,
    ttl: number /* seconds */
  ) => redisClient.set(key, value, { EXAT: now() + ttl });

  public clearValue = async (key: string) => redisClient.del(key);

  // Tokens
  public async createToken(
    label: string,
    values: Record<string, unknown> = {},
    expiresIn: number
  ) {
    try {
      if (!jwtRedis) {
        throw new Error("Cannot create a token until jwtRedis is initialized.");
      }

      this.logger.info("Creating a token.");

      const payload = { jti: label, ...values };
      const token = await jwtRedis.sign(payload, config.JWT_SECRET, {
        expiresIn,
      });

      this.logger.info("Successfully created a token.");

      return token;
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to create a token."
      );

      throw error;
    }
  }

  public async verifyToken(token: string) {
    try {
      if (!jwtRedis) {
        throw new Error("Cannot verify a token until jwtRedis is initialized.");
      }

      this.logger.info("Verifying a token.");

      const verified = await jwtRedis.verify(token, config.JWT_SECRET);

      this.logger.info("Successfully verified a token.");

      return verified;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.info("A token was invalid.");
        throw error;
      }
    }
  }

  public async decodeToken(token: string) {
    try {
      return jwtRedis?.decode(token);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to decode a token."
        );
      }
    }
  }

  public async destroyToken(label: string) {
    try {
      if (!jwtRedis) {
        throw new Error(
          "Cannot destroy a token until jwtRedis is initialized."
        );
      }

      this.logger.info({ label }, "Destroying a token.");

      const destroyed = await jwtRedis.destroy(label);

      if (destroyed) {
        this.logger.info("Successfully destroyed a token.");
      } else {
        this.logger.info("There was no token to destroy.");
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Failed to destroy a token."
        );

        throw error;
      }
    }
  }

  private async initializeJwtr() {
    try {
      this.logger.info("Initializing jwt-redis.");

      await redisClient.connect();

      jwtRedis = new JWTRedis(redisClient as any);

      this.logger.info("Successfully initialized jwt-redis.");
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to initialize jwt-redis."
      );

      throw error;
    }
  }

  private handleRedisError = (error: unknown) => {
    this.logger.error(
      { error: (error as Error).toString() },
      "Redis encountered an error."
    );
  };
}
