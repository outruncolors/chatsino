import { now, decrypt, encrypt } from "helpers";
import * as config from "config";
import { ClientRepository, SafeClient } from "repositories";
import { CacheService } from "./cache.service";

export interface Ticket {
  issuedAt: number;
  issuedTo: string;
  username: string;
}

export class TicketService {
  public static formatTicket = (
    username: string,
    location: string
  ): Ticket => ({
    issuedAt: now(),
    issuedTo: location,
    username,
  });

  public static formatLabel = (username: string) => `${username}/Ticket`;

  private cacheService = new CacheService();
  private clientRepository = new ClientRepository();

  public grantTicket = async (username: string, location: string) => {
    const ticket = TicketService.formatTicket(username, location);
    const encryptedTicket = await this.encryptTicket(ticket);
    const client = await this.clientRepository.getClientByUsername(username);

    if (!client) {
      throw new Error(`No client found with username ${username}`);
    }

    await this.cacheService.setValue(
      encryptedTicket,
      JSON.stringify(ClientRepository.safetify(client)),
      config.TICKET_CACHE_TTL
    );

    return encryptedTicket;
  };

  public validateTicket = async (encryptedTicket: string, location: string) => {
    const client = (await this.cacheService.getValue(
      encryptedTicket
    )) as SafeClient;

    if (!client) {
      throw new Error("Provided ticket does not exist in cache.");
    }

    const ticket = await this.decryptTicket(encryptedTicket);

    if (ticket.username !== client.username) {
      throw new Error("Provided ticket was not assigned to the same user.");
    }

    if (ticket.issuedTo !== location) {
      throw new Error("Provided ticket was not assigned to the same location.");
    }

    await this.cacheService.clearValue(encryptedTicket);

    return client;
  };

  private encryptTicket = async (ticket: Ticket) => {
    const { encryptedData, iv } = encrypt(JSON.stringify(ticket));
    const encryptedTicket = Buffer.from([encryptedData, iv].join("&")).toString(
      "base64"
    );

    return encryptedTicket;
  };

  private decryptTicket = async (encryptedTicket: string) => {
    const value = Buffer.from(encryptedTicket, "base64").toString("utf-8");
    const [encryptedData, iv] = value.split("&");
    const ticket = JSON.parse(decrypt({ iv, encryptedData })) as Ticket;

    return ticket;
  };
}
