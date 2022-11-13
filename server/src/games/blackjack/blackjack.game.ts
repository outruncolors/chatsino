import Chance from "chance";
import { buildDeckOfCards } from "../common";
import * as commonConfig from "../common/config";
import * as gameConfig from "./blackjack.config";

const config = {
  ...commonConfig,
  ...gameConfig,
};

const CHANCE = new Chance();

export type FinishedBlackjackStatus = "pushed" | "won" | "lost" | "blackjack";

export type BlackjackStatus = FinishedBlackjackStatus | "waiting" | "playing";

export type BlackjackAction =
  | "deal"
  | "hit"
  | "stay"
  | "double-down"
  | "buy-insurance";

export type BlackjackState = {
  dealerCards: string[];
  dealerValue: number;
  playerCards: string[];
  playerValue: number;
  playerBoughtInsurance: boolean;
  playerDoubledDown: boolean;
  playerStayed: boolean;
  actions: BlackjackAction[];
  status: BlackjackStatus;
};

export class BlackjackGame {
  public static getCardValue(card: string) {
    const [rank] = card;
    return rank === "A"
      ? 0
      : Math.min(config.PLAYING_CARD_RANKS.indexOf(rank) + 2, 10);
  }

  public static getHandValue(cards: string[]) {
    if (cards.length === 0) {
      return 0;
    }

    const possibilities: number[] = [];
    const valueWithoutAces = cards
      .map(BlackjackGame.getCardValue)
      .reduce((prev, next) => prev + next, 0);
    const numberOfAces = cards.reduce(
      (prev, [card]) => (card === "A" ? prev + 1 : prev),
      0
    );

    for (let i = 0; i < numberOfAces + 1; i++) {
      const value = valueWithoutAces + (numberOfAces - i) + i * 11;
      possibilities.push(value > 21 ? -1 : value);
    }

    return Math.max(...possibilities);
  }

  public dealerCards = [] as string[];
  public playerCards = [] as string[];
  public playerBoughtInsurance = false;
  public playerDoubledDown = false;
  public playerStayed = false;

  public get dealerValue() {
    return BlackjackGame.getHandValue(this.dealerCards);
  }

  public get dealerHasHit() {
    return this.dealerCards.length > 2;
  }

  public get dealerShowingAce() {
    const [[dealerShownCard]] = this.dealerCards;
    return dealerShownCard === "A";
  }

  public get playerValue() {
    return BlackjackGame.getHandValue(this.playerCards);
  }

  public get playerHasHit() {
    return this.playerCards.length > 2;
  }

  public get playerCanPurchaseInsurance() {
    return this.dealerShowingAce && !this.playerBoughtInsurance;
  }

  public get playerCanDoubleDown() {
    return [10, 11].includes(this.playerValue) && !this.playerHasHit;
  }

  public get insuranceApplies() {
    return (
      this.dealerShowingAce && this.dealerValue === 21 && !this.dealerHasHit
    );
  }

  public get deck() {
    const deck = buildDeckOfCards();
    const cardsAlreadyDealt = this.playerCards
      .concat(this.dealerCards)
      .reduce((prev, next) => {
        if (!prev[next]) {
          prev[next] = 0;
        }
        prev[next]++;
        return prev;
      }, {} as Record<string, number>);
    const cardsRemaining = deck.reduce((prev, next) => {
      const amount =
        config.BLACKJACK_DECK_COUNT - (cardsAlreadyDealt[next] ?? 0);
      return prev.concat(Array.from({ length: amount }, () => next));
    }, [] as string[]);

    return CHANCE.shuffle(cardsRemaining);
  }

  public get actions() {
    const choices: BlackjackAction[] = [];

    if (this.status === "playing") {
      choices.push("hit", "stay");
    } else {
      choices.push("deal");
    }

    if (this.playerCanDoubleDown) {
      choices.push("double-down");
    }

    if (this.playerCanPurchaseInsurance) {
      choices.push("buy-insurance");
    }

    return choices;
  }

  public get status(): BlackjackStatus {
    if (this.playerCards.length === 0) {
      return "waiting";
    }

    const justDealt = !this.playerHasHit && !this.dealerHasHit;

    // Both player and dealer were initially dealt 21: Push.
    if (justDealt && this.playerValue === 21 && this.dealerValue === 21) {
      return "pushed";
    }

    // Player was originally dealt 21, dealer was not: Blackjack.
    if (justDealt && this.playerValue === 21) {
      return "blackjack";
    }

    // Player went bust: Loss.
    if (this.playerValue === -1) {
      return "lost";
    }

    // Dealer went bust: Win.
    if (this.dealerValue === -1) {
      return "won";
    }

    // The game is over: figure out the outcome.
    if (this.playerStayed) {
      if (this.playerValue > this.dealerValue) {
        return "won";
      } else if (this.dealerValue > this.playerValue) {
        return "lost";
      } else {
        return "pushed";
      }
    }

    // Player is still playing.
    return "playing";
  }

  public deal() {
    this.ensureNotPlaying();

    const [first, second, third] = this.deck;

    this.playerCards.push(first, third);
    this.dealerCards.push(second);
  }

  public hit() {
    this.ensurePlaying();

    const [card] = this.deck;
    this.playerCards.push(card);
  }

  public stay() {
    this.ensurePlaying();

    this.playerStayed = true;
    this.takeDealerTurn();
  }

  public doubleDown() {
    this.ensurePlaying();

    if (!this.playerCanDoubleDown) {
      throw new CannotTakeActionError();
    }

    this.playerDoubledDown = true;

    this.hit();
    this.stay();
  }

  public buyInsurance() {
    this.ensurePlaying();

    if (!this.playerCanPurchaseInsurance) {
      throw new CannotTakeActionError();
    }

    this.playerBoughtInsurance = true;
  }

  public serialize(): BlackjackState {
    return {
      dealerCards: this.dealerCards,
      playerCards: this.playerCards,
      playerBoughtInsurance: this.playerBoughtInsurance,
      playerDoubledDown: this.playerDoubledDown,
      playerStayed: this.playerStayed,
      dealerValue: this.dealerValue,
      playerValue: this.playerValue,
      actions: this.actions,
      status: this.status,
    };
  }

  public deserialize(state: BlackjackState) {
    const {
      dealerCards,
      playerCards,
      playerBoughtInsurance,
      playerDoubledDown,
      playerStayed,
    } = state;

    this.dealerCards = dealerCards;
    this.playerCards = playerCards;
    this.playerBoughtInsurance = playerBoughtInsurance;
    this.playerDoubledDown = playerDoubledDown;
    this.playerStayed = playerStayed;

    return this;
  }

  private ensurePlaying() {
    if (this.status !== "playing") {
      throw new NoGameInProgressError();
    }
  }

  private ensureNotPlaying() {
    if (this.status === "playing") {
      throw new GameInProgressError();
    }
  }

  private takeDealerTurn() {
    const deck = this.deck;

    while (this.dealerValue < 17 && this.dealerValue !== -1) {
      const [card] = deck;
      this.dealerCards.push(card);
    }
  }
}

export class GameInProgressError extends Error {}
export class NoGameInProgressError extends Error {}
export class CannotTakeActionError extends Error {}
