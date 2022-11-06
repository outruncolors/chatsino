import { ChatsinoLogger } from "logging";
import { ClientRepository } from "repositories";

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
}
