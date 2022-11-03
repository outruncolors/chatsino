import { scrypt, randomBytes } from "crypto";
import { ChatsinoLogger } from "logging";
import { Client, ClientRepository } from "repositories";
import { now } from "helpers";
import * as config from "config";
import { CacheService } from "./cache.service";
import { ClientPermissionLevel } from "../repositories";

export type TokenKind = "access" | "refresh";

export type DecodedAuthToken = {
  username: string;
  kind: TokenKind;
  permissionLevel: ClientPermissionLevel;
  permissions: ClientPermissionLevel[];
};

export interface AuthenticatedClient extends Omit<Client, "hash" | "salt"> {
  connectedAt: number;
}

export class AuthenticationService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private clientRepository = new ClientRepository();
  private cacheService = new CacheService();

  public async signup(
    username: string,
    password: string
  ): Promise<AuthenticatedClient> {
    try {
      this.logger.info(
        { client: username },
        "A client is attempting to sign up."
      );

      if (password.length < config.MINIMUM_PASSWORD_SIZE) {
        throw new Error(
          `Passwords must be a minimum of ${config.MINIMUM_PASSWORD_SIZE} characters.`
        );
      }

      const salt = randomBytes(config.SALT_SIZE).toString("hex");
      const hash = await this.generateHash(password, salt);

      await this.clientRepository.createClient(
        username,
        hash,
        salt,
        "admin:unlimited" // TODO: Change me.
      );

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        return this.createAuthenticatedClient(client);
      } else {
        throw new Error(
          `Could not find new client with username of ${username}.`
        );
      }
    } catch (error) {
      this.logger.error(
        { client: username, error: (error as Error).message },
        "A client was unable to sign up."
      );

      throw error;
    }
  }

  public async signin(
    username: string,
    password: string
  ): Promise<AuthenticatedClient> {
    try {
      this.logger.info(
        { client: username },
        "A client is attempting to sign in."
      );

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        const hash = await this.generateHash(password, client.salt);

        if (client.hash === hash) {
          const authenticatedClient = await this.createAuthenticatedClient(
            client
          );

          this.logger.info(
            { client: username },
            "A client successfully signed in."
          );

          return authenticatedClient;
        } else {
          throw new Error(`client provided an invalid password.`);
        }
      } else {
        throw new Error(`client with username of ${username} was not found.`);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { client: username, error: error.message },
          "A client was unable to sign in."
        );
      }

      throw error;
    }
  }

  public async signout(username: string) {
    try {
      this.logger.info(
        { client: username },
        "A client is attempting to sign out."
      );

      await this.destroyClientAccessToken(username);
      await this.destroyClientRefreshToken(username);

      this.logger.info(
        { client: username },
        "A client successfully signed out."
      );
    } catch (error) {
      this.logger.error(
        { client: username, error: (error as Error).message },
        "A client was unable to sign out."
      );

      throw error;
    }
  }

  public async validateToken(token: string): Promise<null | DecodedAuthToken> {
    try {
      if (!token) {
        return null;
      }

      // The token definitely came from us.
      await this.cacheService.verifyToken(token);

      // Does the permission level of the token match the specified user?
      const { username, kind, permissionLevel } =
        (await this.cacheService.decodeToken(token)) as DecodedAuthToken;

      let actualPermissionLevel = permissionLevel;

      if (username && permissionLevel !== "visitor") {
        const existingUser = await this.clientRepository.getClientByUsername(
          username
        );
        actualPermissionLevel = existingUser?.permissionLevel ?? "visitor";
      }

      const permissionRanking: ClientPermissionLevel[] = [
        "visitor",
        "user",
        "admin:limited",
        "admin:unlimited",
      ];
      const permissionIndex = permissionRanking.indexOf(permissionLevel);
      const permissions = permissionRanking.slice(0, permissionIndex + 1);

      return {
        username,
        kind,
        permissionLevel,
        permissions,
      };
    } catch {
      return null;
    }
  }

  private generateHash(input: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) =>
      scrypt(input, salt, config.HASH_SIZE, (err, hash) =>
        err ? reject(err) : resolve(hash.toString("hex"))
      )
    );
  }

  private async createAuthenticatedClient(client: Client) {
    return {
      ...client,
      connectedAt: now(),
    };
  }

  // Access Tokens
  private formatClientAccessLabel(username: string) {
    return `${username}/Access`;
  }

  public createClientAccessToken(client: AuthenticatedClient) {
    return this.cacheService.createToken(
      this.formatClientAccessLabel(client.username),
      {
        username: client.username,
        kind: "access",
        permissionLevel: client.permissionLevel,
      },
      config.JWT_ACCESS_EXPIRATON_TIME
    );
  }

  public destroyClientAccessToken(username: string) {
    return this.cacheService.destroyToken(
      this.formatClientAccessLabel(username)
    );
  }

  // Refresh Tokens
  private formatClientRefreshLabel(username: string) {
    return `${username}/Refresh`;
  }

  public createClientRefreshToken(username: string) {
    return this.cacheService.createToken(
      this.formatClientRefreshLabel(username),
      {
        username,
        kind: "refresh",
      },
      config.JWT_REFRESH_EXPIRATION_TIME
    );
  }

  public destroyClientRefreshToken(username: string) {
    return this.cacheService.destroyToken(
      this.formatClientRefreshLabel(username)
    );
  }
}
