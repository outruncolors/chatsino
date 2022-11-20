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
  SendChatMessage = "sendChatMessage",
  ListChatrooms = "listChatrooms",
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
  }

  private handleSendChatMessage = async (messageString: string) => {
    const { kind, args, from } = this.parseMessage(messageString);

    this.logger.info({ kind, args, from }, "Handling sendChatMessage()");

    try {
      const { message, room } = await SendChatMessageSchema.validate(args);

      this.chatroomService.sendMessageToChatroom({
        from: from.id,
        content: message,
        sentTo: [room],
      });

      // Inform everyone else in the room that a new message has come in.

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

  private handleListChatrooms = async (messageString: string) => {
    const { kind, from } = this.parseMessage(messageString);

    this.logger.info({ kind, from }, "Handling listChatrooms()");

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
    message: yup.string().min(1).required(),
    room: yup.string().required(),
  })
  .required();
