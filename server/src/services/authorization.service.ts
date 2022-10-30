import { scrypt, randomBytes } from "crypto";
import { ChatsinoLogger } from "logging";
import { Client, ClientRepository } from "repositories";
import { now } from "helpers";
import * as config from "config";
import { CacheService } from "./cache.service";

export interface AuthorizedClient extends Omit<Client, "hash" | "salt"> {
  connectedAt: number;
  token: string;
}

export class AuthorizationService {
  public static instance = new AuthorizationService();

  private logger = ChatsinoLogger.instance;
  private clientRepository = ClientRepository.instance;
  private cacheService = CacheService.instance;

  public async signup(
    username: string,
    password: string
  ): Promise<AuthorizedClient> {
    try {
      this.logger.info({ username }, "A client is attempting to sign up.");

      if (password.length < config.MINIMUM_PASSWORD_SIZE) {
        throw new Error(
          `Passwords must be a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`
        );
      }

      const salt = randomBytes(config.SALT_SIZE).toString("hex");
      const hash = await this.generateHash(password, salt);

      await this.clientRepository.createClient(username, hash, salt);

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        return {
          id: client.id,
          username: client.username,
          connectedAt: now(),
          token: await this.generateClientSessionToken(username),
        };
      } else {
        throw new Error(
          `Could not find new Client with username of ${username}.`
        );
      }
    } catch (error) {
      this.logger.error(
        { username, error: (error as Error).message },
        "A client was unable to sign up."
      );

      throw error;
    }
  }

  public async signin(
    username: string,
    password: string
  ): Promise<AuthorizedClient> {
    try {
      this.logger.info({ username }, "A client is attempting to sign in.");

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        const hash = await this.generateHash(password, client.salt);

        if (client.hash === hash) {
          this.logger.info({ username }, "A client successfully signed in.");

          return {
            id: client.id,
            username: client.username,
            connectedAt: now(),
            token: await this.generateClientSessionToken(username),
          };
        } else {
          throw new Error(`Client provided an invalid password.`);
        }
      } else {
        throw new Error(`Client with username of ${username} was not found.`);
      }
    } catch (error) {
      this.logger.error(
        { username, error: (error as Error).message },
        "A client was unable to sign in."
      );

      throw error;
    }
  }

  public async signout(username: string) {
    try {
      this.logger.info({ username }, "A client is attempting to sign out.");

      await this.destroyClientSessionToken(username);

      this.logger.info({ username }, "A client successfully signed out.");
    } catch (error) {
      this.logger.error(
        { username, error: (error as Error).message },
        "A client was unable to sign out."
      );

      throw error;
    }
  }

  public async validateToken(token: string) {
    try {
      await this.cacheService.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }

  private generateHash(input: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) =>
      scrypt(input, salt, config.HASH_SIZE, (err, hash) =>
        err ? reject(err) : resolve(hash.toString("hex"))
      )
    );
  }

  private formatClientSessionLabel(username: string) {
    return `${username}/Session`;
  }

  private async generateClientSessionToken(username: string) {
    const token = await this.cacheService.createToken(
      this.formatClientSessionLabel(username),
      {
        username,
      }
    );

    return token;
  }

  private destroyClientSessionToken(username: string) {
    return this.cacheService.destroyToken(
      this.formatClientSessionLabel(username)
    );
  }
}
