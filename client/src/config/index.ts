// Re-export all configuration shared between client and server.
export * from "../shared/config";

export const SOCKET_SERVER_ADDRESS = "wss://localhost:8080";

export const HTTPS_SERVER_ADDRESS = "https://localhost:8080";

export const API_BASE_URL = "/api";

export const API_TIMEOUT = 1000;

export const SOCKET_RECONNECT_ATTEMPT_RATE = 5000;
