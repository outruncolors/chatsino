import { SourcedSocketMessageSchema, sourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import {
  CLIENT_MESSAGE_CHANNEL,
  BaseSocketController,
  publisher,
  subscriber,
} from "./base.socket.controller";
import {
  SubcontrollerEvents,
  SubcontrollerSuccessResponseSchema,
  SubcontrollerErrorResponseSchema,
} from "./base.subcontroller";

export class SocketController extends BaseSocketController {
  public constructor(wss: WebSocketServer) {
    super(wss);

    subscriber.subscribe(
      CLIENT_MESSAGE_CHANNEL,
      this.handleSubscribedClientMessage
    );
    subscriber.subscribe(
      SubcontrollerEvents.SuccessResponse,
      this.handleSendSuccessResponse
    );
    subscriber.subscribe(
      SubcontrollerEvents.ErrorResponse,
      this.handleSendErrorResponse
    );
  }

  private handleSubscribedClientMessage = async (messageString: string) => {
    try {
      const message = (await sourcedSocketMessageSchema.validate(
        JSON.parse(messageString)
      )) as SourcedSocketMessageSchema;

      // Sanitize

      publisher.publish(message.kind, JSON.stringify(message));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to handle subscribed message."
        );
      }
    }
  };

  private handleSendSuccessResponse = async (messageString: string) => {
    const { to, kind, data } =
      await SubcontrollerSuccessResponseSchema.validate(
        JSON.parse(messageString)
      );

    return this.sendMessageTo(to, {
      kind,
      data,
    });
  };

  private handleSendErrorResponse = async (messageString: string) => {
    const { to, kind, error } = await SubcontrollerErrorResponseSchema.validate(
      JSON.parse(messageString)
    );

    return this.sendMessageTo(to, {
      kind,
      error,
    });
  };
}
