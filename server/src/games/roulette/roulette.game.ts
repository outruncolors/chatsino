import Chance from "chance";
import * as commonConfig from "../common/config";
import * as gameConfig from "./roulette.config";
import type { RouletteBetKind } from "./roulette.config";
import { now } from "helpers";

const config = {
  ...commonConfig,
  ...gameConfig,
};

const CHANCE = new Chance();

export type RouletteBet = {
  clientId: string;
  kind: RouletteBetKind;
  which: unknown;
  wager: number;
};

export type RouletteStatus =
  | "waiting"
  | "taking-bets"
  | "no-more-bets"
  | "spinning"
  | "finished";

export type MaybeTimeInSeconds = null | number;

export type RouletteState = {
  startedAt: MaybeTimeInSeconds;
  endsAt: MaybeTimeInSeconds;
  spinningAt: MaybeTimeInSeconds;
  finishedAt: MaybeTimeInSeconds;
  status: RouletteStatus;
  bets: Record<RouletteBetKind, RouletteBet[]>;
  winners: null | Record<string, number>; // clientId -> ChipWinnings
  result: null | number;
};

export class RouletteGame {
  public bets: RouletteState["bets"] = {
    "straight-up": [],
    line: [],
    column: [],
    dozen: [],
    "even-odd": [],
    "red-black": [],
    "high-low": [],
  };

  private startedAt: RouletteState["startedAt"] = null;
  private result: RouletteState["result"] = null;

  private get endsAt() {
    if (!this.startedAt) {
      return null;
    }

    return this.startedAt + config.TAKING_BETS_DURATION;
  }

  private get spinningAt() {
    if (!this.endsAt) {
      return null;
    }

    return this.endsAt + config.NO_MORE_BETS_DURATION;
  }

  private get finishedAt() {
    if (!this.spinningAt) {
      return null;
    }

    return this.spinningAt + config.SPINNING_DURATION;
  }

  private get resultLine() {
    if (!this.result) {
      return null;
    }

    for (const [line, lineNumbers] of Object.entries(config.LINES)) {
      if (lineNumbers.includes(this.result)) {
        return parseInt(line);
      }
    }

    return null;
  }

  private get resultColumn() {
    if (!this.result) {
      return null;
    }

    for (const [column, columnNumbers] of Object.entries(config.COLUMNS)) {
      if (columnNumbers.includes(this.result)) {
        return parseInt(column);
      }
    }

    return null;
  }

  private get resultDozen() {
    if (!this.result) {
      return null;
    }

    for (const [dozen, dozenNumbers] of Object.entries(config.DOZENS)) {
      if (dozenNumbers.includes(this.result)) {
        return parseInt(dozen);
      }
    }

    return null;
  }

  private get winners() {
    const handlers: Record<RouletteBetKind, (bet: RouletteBet) => boolean> = {
      "straight-up": this.checkStraightUpBet,
      line: this.checkLineBet,
      column: this.checkColumnBet,
      dozen: this.checkDozenBet,
      "even-odd": this.checkEvenOddBet,
      "red-black": this.checkRedBlackBet,
      "high-low": this.checkHighLowBet,
    };

    return Object.entries(this.bets).reduce(
      (prev: RouletteState["winners"], next) => {
        prev = prev!;
        const [bet, bets] = next;
        const betKind = bet as RouletteBetKind;
        const handler = handlers[betKind];

        for (const clientBet of bets) {
          const won = handler(clientBet);

          if (won) {
            if (!prev[clientBet.clientId]) {
              prev[clientBet.clientId] = 0;
            }

            prev[clientBet.clientId] +=
              clientBet.wager +
              config.PAYOUT_MULTIPLIERS[betKind] * clientBet.wager;
          }
        }

        return prev;
      },
      {}
    );
  }

  public get status(): RouletteStatus {
    if (!this.startedAt || !this.endsAt) {
      return "waiting";
    }

    const rightNow = now();

    if (rightNow >= this.finishedAt!) {
      return "finished";
    }

    if (rightNow >= this.spinningAt!) {
      return "spinning";
    }

    if (rightNow >= this.endsAt!) {
      return "no-more-bets";
    }

    return "taking-bets";
  }

  public startTakingBets() {
    this.ensureWaiting();
    this.startedAt = now();
  }

  public spin() {
    this.ensureFinished();
    this.ensureResultNotDetermined();

    this.result = CHANCE.integer({ min: 0, max: 37 }); // 37 === 00
  }

  public serialize(): RouletteState {
    return {
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      spinningAt: this.spinningAt,
      finishedAt: this.finishedAt,
      status: this.status,
      bets: this.bets,
      result: this.result,
      winners: this.winners,
    };
  }

  public deserialize(state: RouletteState) {
    const { startedAt, bets } = state;

    this.startedAt = startedAt;
    this.bets = bets;

    return this;
  }

  private ensureWaiting() {
    if (this.status !== "waiting") {
      throw new CannotStartTakingBetsError();
    }
  }

  private ensureFinished() {
    if (this.status !== "finished") {
      throw new CannotSpinError();
    }
  }

  private ensureResultNotDetermined() {
    if (this.result != null || this.winners != null) {
      throw new AlreadySpunError();
    }
  }

  private checkStraightUpBet(bet: RouletteBet) {
    return bet.which === this.result;
  }

  private checkLineBet(bet: RouletteBet) {
    return bet.which === this.resultLine;
  }

  private checkColumnBet(bet: RouletteBet) {
    return bet.which === this.resultColumn;
  }

  private checkDozenBet(bet: RouletteBet) {
    return bet.which === this.resultDozen;
  }

  private checkEvenOddBet(bet: RouletteBet) {
    const isEven = Boolean(this.result && this.result % 2 === 0);
    const evenOdd = isEven ? "even" : "odd";

    return (bet.which as string).toLowerCase() === evenOdd;
  }

  private checkRedBlackBet(bet: RouletteBet) {
    const isRed = config.RED_NUMBERS.includes(this.result as number);
    const redBlack = isRed ? "red" : "black";

    return (bet.which as string).toLowerCase() === redBlack;
  }

  private checkHighLowBet(bet: RouletteBet) {
    const isHigh = this.result! > 18;
    const highLow = isHigh ? "high" : "low";

    return (bet.which as string).toLowerCase() === highLow;
  }
}

export class CannotStartTakingBetsError extends Error {}
export class CannotSpinError extends Error {}
export class AlreadySpunError extends Error {}
