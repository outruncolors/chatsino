import { scrypt, randomBytes } from "crypto";
import { ChatsinoLogger } from "logging";
import { ClientRepository, ClientPermissionLevel } from "repositories";
import { derivePermissions } from "helpers";
import * as config from "config";
import { CacheService } from "./cache.service";

export type TokenKind = "access" | "refresh";

export interface AuthenticatedClient {
  id: number;
  username: string;
  permissionLevel: ClientPermissionLevel;
}

export type ClientTokenData = {
  id: number;
  username: string;
  kind: TokenKind;
  permissionLevel: ClientPermissionLevel;
  permissions: ClientPermissionLevel[];
};

export class AuthenticationService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private clientRepository = new ClientRepository();
  private cacheService = new CacheService();

  public async signup(
    username: string,
    password: string,
    permissionLevel: ClientPermissionLevel = "user"
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
        permissionLevel
      );

      const client = await this.clientRepository.getClientByUsername(username);

      if (client) {
        return {
          id: client.id,
          username,
          permissionLevel: client.permissionLevel,
        };
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
          this.logger.info(
            { client: username },
            "A client successfully signed in."
          );

          return {
            id: client.id,
            username,
            permissionLevel: client.permissionLevel,
          };
        } else {
          throw new Error("Client provided an invalid password.");
        }
      } else {
        throw new Error(`Client with username of ${username} was not found.`);
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
      if (error instanceof Error) {
        this.logger.error(
          { client: username, error: error.message },
          "A client was unable to sign out."
        );

        throw error;
      }
    }
  }

  public async validateToken(token: string): Promise<null | ClientTokenData> {
    try {
      if (!token) {
        return null;
      }

      // The token definitely came from us.
      await this.cacheService.verifyToken(token);

      // Does the permission level of the token match the specified user?
      const { id, username, kind, permissionLevel } =
        (await this.cacheService.decodeToken(token)) as ClientTokenData;

      if (!username || !kind || !permissionLevel) {
        return null;
      }

      const existingUser = await this.clientRepository.getClientByUsername(
        username
      );

      if (!existingUser) {
        return null;
      }

      const permissions = derivePermissions(permissionLevel);

      if (!permissions.includes(permissionLevel)) {
        return null;
      }

      return {
        id,
        username,
        kind,
        permissionLevel,
        permissions,
      };
    } catch {
      return null;
    }
  }

  public async getChipBalance(clientId: number) {
    try {
      this.logger.info({ clientId }, "Getting chip balance for client.");

      const balance = await this.clientRepository.getChipBalance(clientId);

      return balance;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { clientId, error: error.message },
          "Unable to get chip balance for client."
        );
      }

      return 0;
    }
  }

  private generateHash(input: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) =>
      scrypt(input, salt, config.HASH_SIZE, (err, hash) =>
        err ? reject(err) : resolve(hash.toString("hex"))
      )
    );
  }

  // Access Tokens
  private formatClientAccessLabel(username: string) {
    return `${username}/Access`;
  }

  public createClientAccessToken(client: AuthenticatedClient) {
    return this.cacheService.createToken(
      this.formatClientAccessLabel(client.username),
      {
        id: client.id,
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
