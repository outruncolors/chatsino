import { useAuthentication } from "hooks";

export function Chatsino() {
  const { requestTicket, signout } = useAuthentication();

  return (
    <p>
      Chatsino <br />
      <button type="button" onClick={requestTicket}>
        Enter
      </button>
      <button type="button" onClick={signout}>
        Sign out
      </button>
    </p>
  );
}
