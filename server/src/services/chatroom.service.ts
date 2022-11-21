import { now } from "helpers";
import { ChatsinoLogger } from "logging";

export interface ChatMessage {
  from: number;
  content: string;
  sentTo: string[];
  createdAt: number;
  createdBy: number;
  updatedAt: number;
}

export interface ChatroomConfig {
  title: string;
  description: string;
  blacklist?: Record<string, true>;
  whitelist?: Record<string, true>;
}

export interface Chatroom extends ChatroomConfig {
  clients: number[];
  messages: ChatMessage[];
  createdBy?: number;
  createdAt?: number;
  updatedBy?: number;
  updatedAt?: number;
}

export type ChatroomDirectory = Record<string, Chatroom>;

export type DefaultChatroom = keyof typeof DEFAULT_CHATROOMS;

const DEFAULT_CHATROOMS: ChatroomDirectory = {
  Lobby: {
    title: "Lobby",
    description: "<Lobby description>",
    clients: [],
    messages: [],
  },
  Slots: {
    title: "Slots",
    description: "<Slots description>",
    clients: [],
    messages: [],
  },
  Blackjack: {
    title: "Blackjack",
    description: "<Blackjack description>",
    clients: [],
    messages: [],
  },
  Roulette: {
    title: "Roulette",
    description: "<Roulette description>",
    clients: [],
    messages: [],
  },
  Racing: {
    title: "Racing",
    description: "<Racing description>",
    clients: [],
    messages: [],
  },
  Crossing: {
    title: "Crossing",
    description: "<Crossing description>",
    clients: [],
    messages: [],
  },
};

export class ChatroomService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private chatrooms: ChatroomDirectory = DEFAULT_CHATROOMS;

  public getChatroom = (title: string) => {
    const chatroom = this.chatrooms[title];

    if (!chatroom) {
      throw new NonexistentChatroomError();
    }

    return chatroom;
  };

  public listChatroomClients = (clientId: number, chatroomId: string) => {
    const chatroom = this.getChatroom(chatroomId);

    if (!this.clientCanJoinChatroom(clientId, chatroomId)) {
      throw new NotAllowedInChatroomError();
    }

    return chatroom.clients;
  };

  public listChatroomMessages = (clientId: number, chatroomId: string) => {
    const chatroom = this.getChatroom(chatroomId);

    if (!this.clientCanJoinChatroom(clientId, chatroomId)) {
      throw new NotAllowedInChatroomError();
    }

    return chatroom.messages;
  };

  public listPublicChatrooms = () =>
    Object.values(this.chatrooms).filter((chatroom) =>
      Object.keys(DEFAULT_CHATROOMS).includes(chatroom.title)
    );

  public joinChatroom = (clientId: number, chatroomId: string) => {
    if (!this.clientCanJoinChatroom(clientId, chatroomId)) {
      throw new NotAllowedInChatroomError();
    }

    this.leaveAllChatrooms(clientId);

    const chatroom = this.chatrooms[chatroomId]!;

    chatroom.clients.push(clientId);

    this.logger.info({ clientId, chatroomId }, "Client joined a chatroom.");
  };

  public leaveAllChatrooms = (clientId: number) => {
    this.logger.info({ clientId }, "Client left all chatrooms.");

    for (const chatroom of Object.values(this.chatrooms)) {
      chatroom.clients = chatroom.clients.filter((id) => id !== clientId);
    }
  };

  public sendMessageToChatroom = (message: ChatMessage) => {
    for (const chatroomId of message.sentTo) {
      const chatroom = this.getChatroom(chatroomId);

      if (!this.clientCanJoinChatroom(message.from, chatroomId)) {
        throw new NotAllowedInChatroomError();
      }

      chatroom.messages.push(message);
    }
  };

  // #region Private Chatrooms
  public createPrivateChatroom = (
    creatorId: number,
    chatroomConfig: ChatroomConfig
  ) => {
    if (this.getClientPrivateChatroom(creatorId)) {
      throw new ClientAlreadyHasPrivateChatroomError();
    }

    if (this.getChatroom(chatroomConfig.title)) {
      throw new ChatroomWithNameExistsError();
    }

    this.logger.info(
      { creatorId, chatroomConfig },
      "Client created a chatroom."
    );

    this.chatrooms[chatroomConfig.title] = {
      ...chatroomConfig,
      clients: [],
      messages: [],
      createdBy: creatorId,
      createdAt: now(),
      updatedBy: creatorId,
      updatedAt: now(),
    };
  };

  public listPrivateChatrooms = () =>
    Object.values(this.chatrooms).filter(
      (chatroom) => !Object.keys(DEFAULT_CHATROOMS).includes(chatroom.title)
    );

  public updatePrivateChatroom = (
    updaterId: number,
    chatroomId: string,
    chatroomConfig: ChatroomConfig
  ) => {
    if (!this.getChatroom(chatroomId)) {
      throw new NoChatroomFoundError();
    }

    this.chatrooms[chatroomId] = {
      ...this.chatrooms[chatroomId],
      ...chatroomConfig,
      updatedBy: updaterId,
      updatedAt: now(),
    };

    this.logger.info(
      { updaterId, chatroomId, chatroomConfig },
      "Client updated a chatroom."
    );
  };

  public deletePrivateChatroom = (deleterId: number, chatroomId: string) => {
    if (!this.getChatroom(chatroomId)) {
      throw new NoChatroomFoundError();
    }

    if (Object.keys(DEFAULT_CHATROOMS).includes(chatroomId)) {
      throw new CannotDeleteChatroomError();
    }

    delete this.chatrooms[chatroomId];

    this.logger.info({ deleterId, chatroomId }, "Client deleted a chatroom.");
  };
  // #endregion

  private clientCanJoinChatroom = (clientId: number, chatroomId: string) => {
    const chatroom = this.getChatroom(chatroomId);
    const { blacklist, whitelist } = chatroom;

    if (whitelist) {
      return Boolean(whitelist[clientId]);
    } else if (blacklist) {
      return !Boolean(blacklist[clientId]);
    } else {
      return true;
    }
  };

  public getClientPrivateChatroom = (clientId: number) =>
    Object.values(this.chatrooms).find(
      (chatroom) => chatroom.createdBy === clientId
    );
}

export class NonexistentChatroomError extends Error {}
export class NotAllowedInChatroomError extends Error {}
export class ClientAlreadyHasPrivateChatroomError extends Error {}
export class ChatroomWithNameExistsError extends Error {}
export class NoChatroomFoundError extends Error {}
export class CannotDeleteChatroomError extends Error {}
