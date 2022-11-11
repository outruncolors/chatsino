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

  const actions = useMemo(() => {
    const makeActionRequest = (action: BlackjackAction) => {
      makeRequest("takeBlackjackAction", [action]);
    };

    return {
      deal: () => {
        throw new CannotDealError();
      },
      hit: makeActionRequest.bind(null, "hit"),
      stay: makeActionRequest.bind(null, "stay"),
      "double-down": makeActionRequest.bind(null, "double-down"),
      "buy-insurance": makeActionRequest.bind(null, "buy-insurance"),
    } as Record<BlackjackAction, () => unknown>;
  }, [makeRequest]);

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
      unsubscribe(BLACKJACK_SUBSCRIBER_NAME, "getActiveBlackjackGame");
    };
  }, [subscribe, unsubscribe]);

  return useMemo(
    () => ({
      game,
      error,
      load,
      start,
      actions,
    }),
    [game, error, load, start, actions]
  );
}

class CannotDealError extends Error {}
