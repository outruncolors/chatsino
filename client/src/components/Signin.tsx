import { FormEvent, useCallback, useState } from "react";
import { useAuthentication } from "hooks";

type Props = {
  onSignin(): unknown;
};

export function Signin({ onSignin }: Props) {
  const { signin } = useAuthentication();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const handleSignin = async () => {
        try {
          await signin(username, password);
          onSignin();
        } catch (error) {
          console.error("Unable to sign in.", error);
          setErrors((prev) => prev.concat((error as Error).message));
        }
      };

      handleSignin();
    },
    [signin, onSignin, username, password]
  );

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Sign in</legend>
        <p>
          <label htmlFor="username">
            Username <br />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoFocus={true}
            />
          </label>
        </p>
        <p>
          <label htmlFor="password">
            Password <br />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </p>
        <button type="submit">Send</button>
        {errors.length > 0 && <p>Unable to sign in.</p>}
      </fieldset>
    </form>
  );
}
