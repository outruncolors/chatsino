import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthentication, useClient, useSocket } from "hooks";
import { Admin } from "./Admin";
import { Game } from "./games";

export function Chatsino() {
  const { client } = useClient();
  const [entered, setEntered] = useState(false);
  const { signout } = useAuthentication();
  const isAdmin = useMemo(
    () =>
      client &&
      ["admin:limited", "admin:unlimited"].includes(client.permissionLevel),
    [client]
  );

  return (
    <div>
      Chatsino <br />
      {entered ? (
        <Lobby />
      ) : (
        <>
          <button type="button" onClick={() => setEntered(true)}>
            Enter
          </button>
          <button type="button" onClick={signout}>
            Sign out
          </button>
        </>
      )}
      {isAdmin && <Admin />}
    </div>
  );
}

function Lobby() {
  const { initialize } = useSocket();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  });

  return (
    <div>
      Lobby <br /> <Game />
    </div>
  );
}
