const { build } = require("esbuild");
const path = require("path");
const package = require("./package.json");
const { config: configureEnvironmentVariables } = require("dotenv");

configureEnvironmentVariables({
  path:
    process.env.NODE_ENV === "production"
      ? path.join(__dirname, "./.env/.production.env")
      : path.join(__dirname, "./.env/.development.env"),
});

const options = {
  entryPoints: ["./src"],
  platform: "node",
  outfile: path.resolve(__dirname, "./build/chatsino.js"),
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  define: {
    "process.env.NODE_ENV": `"${process.env.NODE_ENV ?? "development"}"`,
    "process.env.VERSION": `"${package.version}"`,
    "process.env.DEBUG": process.env.DEBUG,
    "process.env.PORT": process.env.PORT,
  },
};

build(options).catch(() => process.exit(1));
