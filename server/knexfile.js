require("./dotenv.config");

module.exports = {
  client: "pg",
  connection: process.env.POSTGRES_CONNECTION_STRING,
  seeds: {
    directory: "../database/seeds",
  },
};
