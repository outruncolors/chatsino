import { Response } from "express";

export const successResponse = (
  res: Response,
  message: string,
  data?: Record<string, unknown>
) =>
  res.status(200).send({
    error: false,
    result: "OK",
    message,
    data,
  });

export const errorResponse = (res: Response, message: string) =>
  res.status(400).send({
    error: true,
    result: "Error",
    message,
  });
