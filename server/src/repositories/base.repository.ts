import { ChatsinoLogger } from "logging";
import { capitalize } from "helpers";
import { database } from "./common";

const initializedRepositories = new Set<string>();

export class BaseRepository {
  public logger: ChatsinoLogger;
  private name: string;
  private handleCreateTable: () => Promise<unknown>;

  constructor(name: string, onCreateTable: () => Promise<unknown>) {
    this.name = name;
    this.handleCreateTable = onCreateTable;
    this.logger = new ChatsinoLogger(capitalize(this.name) + "Repository");

    if (!initializedRepositories.has(this.name)) {
      initializedRepositories.add(this.name);
      this.initialize();
    }
  }

  public create() {
    return this.initialize();
  }

  public destroy() {
    return this.dropTable();
  }

  private async initialize() {
    try {
      this.logger.info(`Initializing ${this.name} repository.`);

      await this.createTable();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          { error: error.message },
          `Failed to initialize ${this.name} repository.`
        );

        throw error;
      }
    }
  }

  private async createTable() {
    const hasTable = await database.schema.hasTable(this.name);

    if (hasTable) {
      this.logger.info(`Table "${this.name}" already exists.`);
    } else {
      await this.handleCreateTable();

      this.logger.info(`Created table "${this.name}".`);
    }
  }

  private dropTable() {
    this.logger.info(`Dropping table "${this.name}".`);
    return database.schema.dropTableIfExists(this.name);
  }
}
