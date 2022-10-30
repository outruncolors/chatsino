import path from "path";

// On what port should the server accept requests?
export const PORT = process.env.PORT;

// Where is the certificate and the key located?
export const SSL_CERTIFICATE_PATH = path.join(
  __dirname,
  "../.ssh/localhost.pem"
);

export const SSL_KEY_PATH = path.join(__dirname, "../.ssh/localhost-key.pem");
