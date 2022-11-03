import { useAuthentication } from "hooks";

export function Chatsino() {
  const { signout } = useAuthentication();

  return (
    <p>
      Chatsino <br />
      <button type="button" onClick={signout}>
        Sign out
      </button>
    </p>
  );
}
