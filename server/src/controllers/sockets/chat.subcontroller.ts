import { now } from "helpers";
import { ChatsinoLogger } from "logging";
import {
  ChatroomService,
  NonexistentChatroomError,
  NotAllowedInChatroomError,
} from "services";
import * as yup from "yup";
import { subscriber } from "./base.socket.controller";
import { BaseSubcontroller } from "./base.subcontroller";

export enum ChatSocketMessages {
  // Incoming
  SendChatMessage = "sendChatMessage",
  ListChatrooms = "listChatrooms",
  ListChatroomMessages = "listChatroomMessages",

  // Outgoing
  NewChatMessage = "newChatMessage",
}

export class ChatSubcontroller extends BaseSubcontroller {
  private logger = new ChatsinoLogger(this.constructor.name);
  private chatroomService = new ChatroomService();

  public initialize() {
    this.logger.info("Initializing subscriptions.");

    subscriber.subscribe(
      ChatSocketMessages.SendChatMessage,
      this.handleSendChatMessage
    );
    subscriber.subscribe(
      ChatSocketMessages.ListChatrooms,
      this.handleListChatrooms
    );
    subscriber.subscribe(
      ChatSocketMessages.ListChatroomMessages,
      this.handleListChatroomMessages
    );
  }

  private handleSendChatMessage = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info({ kind, args, from }, ChatSocketMessages.SendChatMessage);

    try {
      const { message, chatroomId } = await SendChatMessageSchema.validate(
        args
      );

      const newMessage = {
        from: from.id,
        content: message,
        sentTo: [chatroomId],
        createdBy: from.id,
        createdAt: now(),
        updatedAt: now(),
      };

      this.chatroomService.sendMessageToChatroom(newMessage);

      const chatroomClients = this.chatroomService.listChatroomClients(
        from.id,
        chatroomId
      );

      for (const clientId of chatroomClients) {
        this.sendSuccessResponse(clientId, ChatSocketMessages.NewChatMessage, {
          message: newMessage,
        });
      }

      return this.sendSuccessResponse(from.id, kind, {
        message: "Successfully sent a chat message.",
      });
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to send a chat message."
      );
    }
  };

  private handleListChatroomMessages = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info({ kind, from }, ChatSocketMessages.ListChatroomMessages);

    try {
      const { chatroomId } = await ListChatroomMessagesSchema.validate(args);

      return this.sendSuccessResponse(from.id, kind, {
        messages: this.chatroomService.listChatroomMessages(
          from.id,
          chatroomId
        ),
      });
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to list chatroom messages."
      );
    }
  };

  private handleListChatrooms = async (messageString: string) => {
    const { kind, from } = this.parseMessage(messageString);

    this.logger.info({ kind, from }, ChatSocketMessages.ListChatrooms);

    try {
      this.sendSuccessResponse(from.id, kind, {
        public: this.chatroomService.listPublicChatrooms(),
        private: this.chatroomService.listPrivateChatrooms(),
      });
    } catch (error) {
      return this.handleErrors(
        from.id,
        kind,
        error,
        "Unable to list chatrooms."
      );
    }
  };

  private handleErrors(
    to: number,
    kind: string,
    error: unknown,
    fallback: string
  ) {
    const sendError = (message: string) =>
      this.sendErrorResponse(to, kind, message);

    if (error instanceof NonexistentChatroomError) {
      return sendError("Chatroom does not exist.");
    }

    if (error instanceof NotAllowedInChatroomError) {
      return sendError("You are not allowed in that chatroom.");
    }

    if (error instanceof yup.ValidationError) {
      return sendError("Validation errors detected.");
    }

    if (error instanceof Error) {
      return sendError(fallback);
    }
  }
}

export const SendChatMessageSchema = yup
  .object({
    chatroomId: yup.string().required(),
    message: yup.string().min(1).required(),
  })
  .required();

export const ListChatroomMessagesSchema = yup
  .object({
    chatroomId: yup.string().required(),
  })
  .required();
