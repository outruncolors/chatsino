import { useClient, useSocket } from "hooks";
import { useEffect, useRef } from "react";
import { useBlackjack } from "./useBlackjack";

export function Blackjack() {
  const { client } = useClient();
  const { initialized } = useSocket();
  const { game, load, start, actions } = useBlackjack();
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
      <section style={{ padding: "2rem" }}>
        {JSON.stringify(game, null, 2)}
      </section>
      {game ? (
        <>
          {game.state.actions.map((action) => (
            <button key={action} onClick={actions[action]}>
              {action}
            </button>
          ))}
        </>
      ) : (
        <button onClick={start}>Deal</button>
      )}
    </div>
  );
}
