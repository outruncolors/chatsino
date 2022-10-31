import { createClient } from "redis";
import JWTRedis from "jwt-redis";
import { ChatsinoLogger } from "logging";
import * as config from "config";

export class CacheService {
  public static instance = new CacheService();

  private logger = new ChatsinoLogger(this.constructor.name);
  private redisClient = createClient();
  private jwtRedis: null | JWTRedis = null;

  constructor() {
    this.redisClient.on("error", this.handleRedisError);
    this.initializeJwtr();
  }

  public async createToken(
    label: string,
    values: Record<string, unknown> = {},
    expiresIn: number
  ) {
    try {
      if (!this.jwtRedis) {
        throw new Error("Cannot create a token until jwtRedis is initialized.");
      }

      this.logger.info("Creating a token.");

      const payload = { jti: label, ...values };
      const token = await this.jwtRedis.sign(payload, config.JWT_SECRET, {
        expiresIn,
      });

      this.logger.info({ token }, "Successfully created a token.");

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
      if (!this.jwtRedis) {
        throw new Error("Cannot verify a token until jwtRedis is initialized.");
      }

      this.logger.info({ token }, "Verifying a token.");

      const verified = await this.jwtRedis.verify(token, config.JWT_SECRET);

      this.logger.info({ token }, "Successfully verified a token.");

      return verified;
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to verify a token."
      );

      throw error;
    }
  }

  public async destroyToken(label: string) {
    try {
      if (!this.jwtRedis) {
        throw new Error(
          "Cannot destroy a token until jwtRedis is initialized."
        );
      }

      this.logger.info({ label }, "Destroying a token.");

      const destroyed = await this.jwtRedis.destroy(label);

      if (destroyed) {
        this.logger.info("Successfully destroyed a token.");
      } else {
        this.logger.info("There was no token to destroy.");
      }
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        "Failed to destroy a token."
      );

      throw error;
    }
  }

  private async initializeJwtr() {
    try {
      this.logger.info("Initializing jwt-redis.");

      await this.redisClient.connect();

      this.jwtRedis = new JWTRedis(this.redisClient as any);

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
