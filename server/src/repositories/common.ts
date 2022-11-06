import knex from "knex";
import * as config from "config";

export const database = knex({
  client: "pg",
  connection: config.POSTGRES_CONNECTION_STRING,
  searchPath: ["knex", "public"],
});
