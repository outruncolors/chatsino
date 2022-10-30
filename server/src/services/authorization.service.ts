import { scrypt, randomBytes } from "crypto";
import { ChatsinoLogger } from "logging";
import { Client, ClientRepository } from "repositories";
import { now } from "helpers";
import * as config from "config";

export interface AuthorizedClient extends Omit<Client, "hash" | "salt"> {
  connectedAt: number;
}

export class AuthorizationService {
  public static instance = new AuthorizationService();

  private clientRepository = ClientRepository.instance;
  private logger = ChatsinoLogger.instance;

  public async signup(
    username: string,
    password: string
  ): Promise<AuthorizedClient | undefined> {
    try {
      this.logger.info({ username }, "A client is attempting to sign up.");

      if (password.length < config.MINIMUM_PASSWORD_SIZE) {
        throw new Error(
          `Passwords must be a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`
        );
      }

      const salt = randomBytes(config.SALT_SIZE).toString("hex");
      const hash = await this.generateHash(password, salt);

      this.logger.debug({ salt: salt.length, hash: hash.length }, "LENGTH");

      await this.clientRepository.createClient(username, hash, salt);

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        return {
          id: client.id,
          username: client.username,
          connectedAt: now(),
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
  ): Promise<AuthorizedClient | undefined> {
    try {
      this.logger.info({ username }, "A client is attempting to sign in.");

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        const hash = await this.generateHash(password, client.salt);

        if (client.hash === hash) {
          this.logger.info({ username }, "A client successfully signed in.");

          // Attach JWT.

          return {
            id: client.id,
            username: client.username,
            connectedAt: now(),
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

  private generateHash(input: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) =>
      scrypt(input, salt, config.HASH_SIZE, (err, hash) =>
        err ? reject(err) : resolve(hash.toString("hex"))
      )
    );
  }
}
