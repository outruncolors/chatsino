import axiosLib from "axios";
import { ServerResponse } from "shared";
import * as config from "config";

export const axios = axiosLib.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
});

export async function makeRequest<T>(
  method: "get" | "post",
  route: string,
  body?: Record<string, string>
): Promise<T> {
  const response = await axios[method](route, body);
  const data = response.data as ServerResponse<T>;

  if (!data.error && data.result === "OK") {
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
