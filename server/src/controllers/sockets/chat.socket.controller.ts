import { ChatroomService, NotAllowedInChatroomError } from "services";
import { SourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import * as yup from "yup";
import { SocketController } from "./socket.controller";

export enum ChatSocketMessages {
  SendChatMessage = "sendChatMessage",
  ListChatrooms = "listChatrooms",
}

export class ChatSocketController extends SocketController {
  private chatroomService = new ChatroomService();

  public constructor(wss: WebSocketServer) {
    super(wss);

    this.addMessageHandler(ChatSocketMessages.SendChatMessage, {
      schema: SendChatMessageSchema,
      handler: this.handleSendChatMessage,
    });
    this.addMessageHandler(ChatSocketMessages.ListChatrooms, {
      handler: this.handleListChatrooms,
    });
  }

  private handleSendChatMessage = async ({
    kind,
    args,
    from,
  }: SourcedSocketMessageSchema) => {
    this.logger.info({ kind, args, from }, "Handling sendChatMessage()");

    const message = args.message as string;
    const room = args.room as string;

    try {
      const succeeded = await this.attempt({ kind, args, from }, async () => {
        this.chatroomService.sendMessageToChatroom({
          from: from.id,
          content: message,
          sentTo: [room],
        });
      });

      if (succeeded) {
        // Inform everyone else in the room that a new message has come in.
      }

      this.logger.info({ succeeded }, "Handled.");
    } catch (error) {
      if (error instanceof NotAllowedInChatroomError) {
        return this.sendMessageTo(from.id, {
          kind,
          error: `You are not allowed in ${room}.`,
        });
      }

      if (error instanceof Error) {
        return this.sendMessageTo(from.id, {
          kind,
          error: "An unknown error occurred.",
        });
      }
    }
  };

  private handleListChatrooms = async ({
    kind,
    from,
  }: SourcedSocketMessageSchema) => {
    this.sendMessageTo(from.id, {
      kind,
      data: {
        public: this.chatroomService.listPublicChatrooms(),
        private: this.chatroomService.listPrivateChatrooms(),
      },
    });
  };
}

export const SendChatMessageSchema = yup
  .object({
    message: yup.string().min(1).required(),
    room: yup.string().required(),
  })
  .required();
