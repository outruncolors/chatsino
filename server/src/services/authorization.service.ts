import bcrypt from "bcrypt";
import { ChatsinoLogger } from "logging";
import { Client, ClientRepository } from "repositories";
import * as config from "config";
import { now } from "helpers";

export interface AuthorizedClient extends Omit<Client, "passwordHash"> {
  connectedAt: number;
}

export class AuthorizationService {
  public static instance = new AuthorizationService();

  private clientRepository = ClientRepository.instance;
  private logger = ChatsinoLogger.instance;

  public async signin(
    username: string,
    password: string
  ): Promise<AuthorizedClient | undefined> {
    try {
      this.logger.info({ username }, "A client is attempting to sign in.");

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        const salt = await bcrypt.genSalt(config.SALT_ROUNDS);
        const hashed = await bcrypt.hash(password, salt);

        if (client.passwordHash === hashed) {
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
    }
  }
}
