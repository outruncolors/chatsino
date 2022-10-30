import path from "path";

// Should debug functionality be enabled?
export const DEBUG = process.env.NODE_ENV !== "production";

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
  process.env.POSTGRES_CONNECTION_STRING;

// Hashing & Salting
export const SALT_SIZE = 128;

export const HASH_SIZE = 60;

export const MINIMUM_PASSWORD_SIZE = 8;

// JSON Web Tokens
export const JWT_SECRET = process.env.JWT_SECRET;

export const JWT_EXPIRATON_TIME = 60 * 20; // Twenty minutes.
