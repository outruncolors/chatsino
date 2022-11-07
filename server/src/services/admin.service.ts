import { ChatsinoLogger } from "logging";
import { ClientPermissionLevel, ClientRepository } from "repositories";

export class AdminService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private clientRepository = new ClientRepository();

  public async payClient(clientId: number, amount: number) {
    try {
      this.logger.info({ clientId, amount }, "Paying a client.");

      return this.clientRepository.payClient(clientId, amount);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Unable to pay a client.");
      }
    }
  }

  public async chargeClient(clientId: number, amount: number) {
    try {
      this.logger.info({ clientId, amount }, "Charging a client.");

      return this.clientRepository.chargeClient(clientId, amount);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to charge a client."
        );
      }
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

      return this.clientRepository.changeClientPermissionLevel(
        clientId,
        permissionLevel
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to change a client's permission level."
        );
      }
    }
  }
}
