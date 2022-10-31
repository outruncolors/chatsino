import pino, { Logger } from "pino";

export class ChatsinoLogger {
  public debug;
  public info;
  public error;
  public fatal;
  public trace;
  public warn;

  private pino: Logger;

  public constructor(name: string) {
    this.pino = pino({
      name,
    });

    this.debug = this.pino.debug.bind(this.pino);
    this.info = this.pino.info.bind(this.pino);
    this.error = this.pino.error.bind(this.pino);
    this.fatal = this.pino.fatal.bind(this.pino);
    this.trace = this.pino.trace.bind(this.pino);
    this.warn = this.pino.warn.bind(this.pino);
  }
}
