import { useCallback, useMemo, useState } from "react";
import { useClient, useSocket } from "hooks";

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

export interface Blackjack {
  clientId: number;
  active: boolean;
  state: BlackjackState;
  wager: number;
  winnings: number;
}

export function useBlackjack() {
  const { client } = useClient();
  const { makeRequest } = useSocket();
  const [game, setGame] = useState<null | Blackjack>(null);
  const load = useCallback(() => {
    if (client) {
      makeRequest("getActiveBlackjackGame", [client.id]);
    }
  }, [client, makeRequest]);

  return useMemo(
    () => ({
      game,
      load,
    }),
    [game, load]
  );
}
