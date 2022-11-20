import { SourcedSocketMessageSchema } from "shared";
import * as yup from "yup";
import { publisher } from "./base.socket.controller";

export enum SubcontrollerEvents {
  SuccessResponse = "success-response",
  ErrorResponse = "error-response",
}

export class BaseSubcontroller {
  public sendSuccessResponse = (to: number, kind: string, data: unknown) =>
    publisher.publish(
      SubcontrollerEvents.SuccessResponse,
      JSON.stringify({
        to,
        kind,
        data,
      })
    );

  public sendErrorResponse = (to: number, kind: string, error: string) =>
    publisher.publish(
      SubcontrollerEvents.ErrorResponse,
      JSON.stringify({
        to,
        kind,
        error,
      })
    );

  public parseMessage = (messageString: string): SourcedSocketMessageSchema => {
    try {
      const message = JSON.parse(messageString);
      return message;
    } catch (error) {
      // Handle
      throw error;
    }
  };
}

export const SubcontrollerResponseSchema = yup.object({
  to: yup.number().required(),
  kind: yup.string().required(),
});

export const SubcontrollerSuccessResponseSchema =
  SubcontrollerResponseSchema.shape({
    data: yup.object().nullable(),
  });

export const SubcontrollerErrorResponseSchema =
  SubcontrollerResponseSchema.shape({
    error: yup.string().required(),
  });
