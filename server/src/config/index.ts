import path from "path";

// Should debug functionality be enabled?
export const DEBUG = process.env.NODE_ENV !== "production";

// What year is it?
export const VERSION = process.env.VERSION;

// On what port should the server accept requests?
export const PORT = process.env.PORT;

// Where is the certificate and the key located?
export const SSL_CERTIFICATE_PATH = path.join(
  __dirname,
  "../.ssh/localhost.pem"
);

export const SSL_KEY_PATH = path.join(__dirname, "../.ssh/localhost-key.pem");

// What is the connection string for Postgres?
export const POSTGRES_CONNECTION_STRING =
  process.env.POSTGRES_CONNECTION_STRING ?? "";

// Seeeeeeekrits
export const JWT_SECRET = process.env.JWT_SECRET ?? "";
export const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
export const COOKIE_SECRET = process.env.COOKIE_SECRET ?? "";
export const CSRF_SECRET = process.env.CSRF_SECRET ?? "";

// Hashing & Salting
export const SALT_SIZE = 128;
export const HASH_SIZE = 60;
export const MINIMUM_PASSWORD_SIZE = 8;

// JSON Web Tokens
export const JWT_ACCESS_EXPIRATON_TIME = 60 * 20; // Twenty minutes.
export const JWT_REFRESH_EXPIRATION_TIME = 60 * 60 * 24; // One day.

// Socket Management
export const DEAD_CONNECTION_CHECK_RATE = 1000 * 30; // Thirty seconds.
