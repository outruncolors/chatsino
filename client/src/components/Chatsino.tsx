import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthentication, useClient, useSocket } from "hooks";
import { Admin } from "./admin";
import { Chat } from "./chat";
import { Game } from "./games";

export function Chatsino() {
  const { client } = useClient();
  const [entered, setEntered] = useState(false);
  const hasInitialized = useRef(false);
  const { signout } = useAuthentication();
  const { initialize } = useSocket();
  const isAdmin = useMemo(
    () =>
      client &&
      ["admin:limited", "admin:unlimited"].includes(client.permissionLevel),
    [client]
  );

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  });

  return (
    <div>
      {!entered && (
        <>
          <button type="button" onClick={() => setEntered(true)}>
            Enter
          </button>
          <button type="button" onClick={signout}>
            Sign out
          </button>
        </>
      )}
      {entered && (
        <>
          <Chat /> <br />
          <Game /> <br />
          {isAdmin && <Admin />}
        </>
      )}
    </div>
  );
}
