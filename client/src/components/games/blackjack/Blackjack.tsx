import { useClient, useSocket } from "hooks";
import { useEffect, useRef } from "react";
import { useBlackjack } from "./useBlackjack";

export function Blackjack() {
  const { client } = useClient();
  const { initialized } = useSocket();
  const { game, load } = useBlackjack();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current && initialized) {
      hasLoaded.current = true;
      load();
    }
  });

  return (
    <div>
      Blackjack <br /> {JSON.stringify(client)}
      {game ? JSON.stringify(game) : "No active game."}
    </div>
  );
}
