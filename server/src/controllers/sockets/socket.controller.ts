import { NoGameInProgressError } from "games";
import { meetsPermissionRequirement } from "helpers";
import { ClientPermissionLevel } from "repositories";
import { SourcedSocketMessageSchema, sourcedSocketMessageSchema } from "shared";
import { WebSocketServer } from "ws";
import { RequiredObjectSchema } from "yup/lib/object";
import { BaseSocketController, subscriber } from "./socket.controller.base";

export interface MessageHandlerConfig {
  schema?: RequiredObjectSchema<any, any, any>;
  handler: (message: SourcedSocketMessageSchema) => unknown;
  requirement?: ClientPermissionLevel;
}

export class SocketController extends BaseSocketController {
  private messageHandlers: Record<string, MessageHandlerConfig> = {};

  public constructor(wss: WebSocketServer) {
    super(wss);

    subscriber.subscribe("client-message", this.handleSubscribedMessage);
  }

  public attempt = async (
    { kind, args, from }: SourcedSocketMessageSchema,
    fn: () => Promise<unknown>
  ) => {
    try {
      await fn();
      return true;
    } catch (error) {
      if (error instanceof InvalidArgumentsError) {
        this.sendMessageTo(from.id, {
          kind,
          args,
          error: `Invalid arguments provided to ${kind}.`,
        });

        return false;
      }

      if (error instanceof NoGameInProgressError) {
        this.sendMessageTo(from.id, {
          kind,
          args,
          error: `${from.id} has no game in progress.`,
        });

        return false;
      }

      if (error instanceof Error) {
        this.logger.error({ error: error.message }, "Failed attempt.");

        throw error;
      }
    }
  };

  public handleSubscribedMessage = async (messageString: string) => {
    try {
      const message = JSON.parse(messageString);

      this.logger.info({ message }, "Attempting to handle subscribed message.");

      const { kind, args, from } = (await sourcedSocketMessageSchema.validate(
        message
      )) as SourcedSocketMessageSchema;
      const messageHandler = this.messageHandlers[kind];

      if (!messageHandler) {
        throw new UnknownMessageKindError();
      }

      const { handler, schema, requirement = "user" } = messageHandler;

      if (schema) {
        try {
          await schema.validate(args);
        } catch (error) {
          throw new InvalidArgumentsError();
        }
      }

      if (!meetsPermissionRequirement(requirement, from.permissionLevel)) {
        throw new NotPermittedError();
      }

      await handler({ kind, args, from });

      this.logger.info("Successfully handled subscribed message.");
    } catch (error) {
      if (error instanceof UnknownMessageKindError) {
        // Handle
      }

      if (error instanceof InvalidArgumentsError) {
        // Handle
      }

      if (error instanceof NotPermittedError) {
        // Handle
      }

      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          "Unable to handle subscribed message."
        );
      }
    }
  };

  public addMessageHandler = (kind: string, config: MessageHandlerConfig) => {
    this.messageHandlers[kind] = config;
  };
}

export class UnknownMessageKindError extends Error {}
export class NotPermittedError extends Error {}
export class InvalidArgumentsError extends Error {}
