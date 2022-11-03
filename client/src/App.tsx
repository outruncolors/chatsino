import { useEffect, useRef, useState } from "react";
import { Signin, Signup } from "components";
import { useAuthentication } from "hooks";

type AppScreen = "signin" | "signup" | "chatsino" | "error";

export function App() {
  const { validate, signout } = useAuthentication();
  const initiallyValidated = useRef(false);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState("signin" as AppScreen);

  useEffect(() => {
    if (!initiallyValidated.current) {
      initiallyValidated.current = true;

      validate()
        .then(setSignedIn)
        .then(() => setValidating(false))
        .catch(() => setValidationError(true));
    }
  }, [validate]);

  useEffect(() => {
    if (signedIn && screen !== "chatsino") {
      setScreen("chatsino");
    }
  }, [signedIn, screen]);

  useEffect(() => {
    if (validationError && screen !== "error") {
      setScreen("error");
    }
  }, [validationError, screen]);

  return (
    <section>
      {["signin", "signup"].includes(screen) && (
        <nav>
          {screen !== "signin" && (
            <button onClick={() => setScreen("signin")}>Sign in</button>
          )}
          {screen !== "signup" && (
            <button onClick={() => setScreen("signup")}>Sign up</button>
          )}
        </nav>
      )}
      {validating ? (
        <p>Validating...</p>
      ) : (
        <>
          {!signedIn && (
            <>
              {screen === "signin" && (
                <Signin onSignin={() => setSignedIn(true)} />
              )}
              {screen === "signup" && (
                <Signup onSignup={() => setSignedIn(true)} />
              )}
            </>
          )}
          {screen === "chatsino" && (
            <p>
              Chatsino <br />
              <button type="button" onClick={signout}>
                Sign out
              </button>
            </p>
          )}
          {screen === "error" && <span>Error</span>}
        </>
      )}
    </section>
  );
}
