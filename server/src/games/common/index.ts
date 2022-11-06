import * as config from "./config";

export function buildDeckOfCards() {
  return config.PLAYING_CARD_RANKS.reduce((deck, rank) => {
    return deck.concat(
      config.PLAYING_CARD_SUITS.map((suit) => `${rank}${suit}`)
    );
  }, [] as string[]);
}
