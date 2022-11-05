const path = require("path");
const { config: configureEnvironmentVariables } = require("dotenv");

const environment = process.env.NODE_ENV;
const environmentPaths = {
  development: path.join(__dirname, "./.env/.development.env"),
  test: path.join(__dirname, "./.env/.development.env"),
  production: path.join(__dirname, "./.env/.production.env"),
};

configureEnvironmentVariables({
  path: environmentPaths[environment],
});
