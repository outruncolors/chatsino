require("./dotenv.config");
const path = require("path");
const { build } = require("esbuild");
const package = require("./package.json");

const options = {
  entryPoints: ["./src"],
  platform: "node",
  outfile: path.resolve(__dirname, "./build/chatsino.js"),
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  define: {
    "process.env.SCRIPT": process.env.SCRIPT
      ? `"${process.env.SCRIPT}"`
      : undefined,
    "process.env.NODE_ENV": `"${process.env.NODE_ENV ?? "development"}"`,
    "process.env.VERSION": `"${package.version}"`,
    "process.env.PORT": process.env.PORT,
    "process.env.POSTGRES_CONNECTION_STRING": `"${process.env.POSTGRES_CONNECTION_STRING}"`,
    "process.env.JWT_SECRET": `"${process.env.JWT_SECRET}"`,
    "process.env.COOKIE_SECRET": `"${process.env.COOKIE_SECRET}"`,
    "process.env.TICKET_SECRET": `"${process.env.TICKET_SECRET}"`,
  },
  external: [
    "mysql2",
    "tedious",
    "oracledb",
    "mysql",
    "better-sqlite3",
    "sqlite3",
    "pg-native",
    "mock-aws-s3",
    "aws-sdk",
  ],
};

build(options).catch(() => process.exit(1));
