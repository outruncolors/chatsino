import { BlackjackRepository, ClientRepository } from "repositories";

export class BlackjackManager {
  private blackjackRepository = new BlackjackRepository();
  private clientRepository = new ClientRepository();

  public async load(clientId: number) {
    return this.blackjackRepository.getActiveBlackjackGame(clientId);
  }

  public async start(clientId: number, wager: number) {
    // Pass
  }
}
