import { now } from "helpers";
import { ChatsinoLogger } from "logging";

export interface ChatMessage {
  author: string;
  content: string;
  createdAt: number;
  editedAt: number;
  sentTo: string[];
}

export interface ChatroomConfig {
  title: string;
  description: string;
  blacklist?: Record<string, true>;
  whitelist?: Record<string, true>;
}

export interface Chatroom extends ChatroomConfig {
  clients: string[];
  messages: ChatMessage[];
  createdBy?: string;
  createdAt?: number;
  updatedBy?: string;
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

export class ChatService {
  private logger = new ChatsinoLogger(this.constructor.name);
  private chatrooms: ChatroomDirectory = DEFAULT_CHATROOMS;

  public joinChatroom = (clientId: string, room: string) => {
    if (!this.clientCanJoinChatroom(clientId, room)) {
      throw new NotAllowedInChatroomError();
    }

    this.leaveAllChatrooms(clientId);

    const chatroom = this.chatrooms[room]!;

    chatroom.clients.push(clientId);

    this.logger.info({ clientId, room }, "Client joined a chatroom.");
  };

  public leaveAllChatrooms = (clientId: string) => {
    this.logger.info({ clientId }, "Client left all chatrooms.");

    for (const chatroom of Object.values(this.chatrooms)) {
      chatroom.clients = chatroom.clients.filter((id) => id !== clientId);
    }
  };

  // #region Private Chatrooms
  public createPrivateChatroom = (
    creatorId: string,
    roomConfig: ChatroomConfig
  ) => {
    if (this.getClientPrivateChatroom(creatorId)) {
      throw new ClientAlreadyHasPrivateChatroomError();
    }

    if (this.getChatroom(roomConfig.title)) {
      throw new ChatroomWithNameExistsError();
    }

    this.logger.info({ creatorId, roomConfig }, "Client created a chatroom.");

    this.chatrooms[roomConfig.title] = {
      ...roomConfig,
      clients: [],
      messages: [],
      createdBy: creatorId,
      createdAt: now(),
      updatedBy: creatorId,
      updatedAt: now(),
    };

    this.joinChatroom(creatorId, roomConfig.title);
  };

  public listPrivateChatrooms = () =>
    Object.values(this.chatrooms).filter(
      (chatroom) => !Object.keys(DEFAULT_CHATROOMS).includes(chatroom.title)
    );

  public updatePrivateChatroom = (
    updaterId: string,
    chatroomTitle: string,
    roomConfig: ChatroomConfig
  ) => {
    if (!this.getChatroom(chatroomTitle)) {
      throw new NoChatroomFoundError();
    }

    this.chatrooms[chatroomTitle] = {
      ...this.chatrooms[chatroomTitle],
      ...roomConfig,
      updatedBy: updaterId,
      updatedAt: now(),
    };

    this.logger.info(
      { updaterId, chatroomTitle, roomConfig },
      "Client updated a chatroom."
    );
  };

  public deletePrivateChatroom = (deleterId: string, chatroomTitle: string) => {
    if (!this.getChatroom(chatroomTitle)) {
      throw new NoChatroomFoundError();
    }

    if (Object.keys(DEFAULT_CHATROOMS).includes(chatroomTitle)) {
      throw new CannotDeleteChatroomError();
    }

    delete this.chatrooms[chatroomTitle];

    this.logger.info(
      { deleterId, chatroomTitle },
      "Client deleted a chatroom."
    );
  };
  // #endregion

  // send

  // edit

  // delete

  // more
  private getChatroom = (title: string) => {
    const chatroom = this.chatrooms[title];

    if (!chatroom) {
      throw new NonexistentChatroomError();
    }

    return chatroom;
  };

  private getClientPrivateChatroom = (clientId: string) =>
    Object.values(this.chatrooms).find(
      (chatroom) => chatroom.createdBy === clientId
    );

  private clientCanJoinChatroom = (clientId: string, room: string) => {
    const chatroom = this.getChatroom(room);
    const { blacklist, whitelist } = chatroom;

    if (whitelist) {
      return Boolean(whitelist[clientId]);
    } else if (blacklist) {
      return !Boolean(blacklist[clientId]);
    } else {
      return true;
    }
  };
}

export class NonexistentChatroomError extends Error {}
export class NotAllowedInChatroomError extends Error {}
export class ClientAlreadyHasPrivateChatroomError extends Error {}
export class ChatroomWithNameExistsError extends Error {}
export class NoChatroomFoundError extends Error {}
export class CannotDeleteChatroomError extends Error {}
