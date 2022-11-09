import { useCallback, useEffect, useMemo, useState } from "react";
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

export const BLACKJACK_SUBSCRIBER_NAME = "blackjack";

export function useBlackjack() {
  const { client } = useClient();
  const { makeRequest, subscribe, unsubscribe } = useSocket();
  const [game, setGame] = useState<null | Blackjack>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (client) {
      makeRequest("getActiveBlackjackGame", [client.id]);
    }
  }, [client, makeRequest]);

  const start = useCallback(() => {
    if (client) {
      makeRequest("startBlackjackGame", [50]);
    }
  }, [client, makeRequest]);

  useEffect(() => {
    subscribe(
      BLACKJACK_SUBSCRIBER_NAME,
      "getActiveBlackjackGame",
      ({ data, error }) => {
        if (error) {
          setError(error);
        } else if (data) {
          setGame(data as Blackjack);
        }
      }
    );

    return () => {
      unsubscribe(BLACKJACK_SUBSCRIBER_NAME);
    };
  }, [subscribe, unsubscribe]);

  return useMemo(
    () => ({
      game,
      error,
      load,
      start,
    }),
    [game, error, load, start]
  );
}
