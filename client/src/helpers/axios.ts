import axiosLib from "axios";
import * as config from "config";

export const axios = axiosLib.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
});
