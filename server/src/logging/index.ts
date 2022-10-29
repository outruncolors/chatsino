import pino from "pino";

export class ChatsinoLogger {
  public static instance = new ChatsinoLogger();

  private pino = pino();

  public debug = this.pino.debug.bind(this.pino);
  public info = this.pino.info.bind(this.pino);
  public error = this.pino.error.bind(this.pino);
  public fatal = this.pino.fatal.bind(this.pino);
  public trace = this.pino.trace.bind(this.pino);
  public warn = this.pino.warn.bind(this.pino);
}
