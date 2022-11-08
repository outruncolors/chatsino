import { useEffect, useRef, useState } from "react";
import { Chatsino, Signin, Signup } from "components";
import {
  ClientProvider,
  SocketProvider,
  useAuthentication,
  useClient,
} from "hooks";

type AppScreen = "signin" | "signup" | "chatsino" | "error";

function Inner() {
  const { client, setClient, setChips } = useClient();
  const { validate } = useAuthentication();
  const [screen, setScreen] = useState("signin" as AppScreen);
  const initiallyValidated = useRef(false);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    if (!initiallyValidated.current) {
      initiallyValidated.current = true;

      const handleValidate = async () => {
        try {
          const { client, chips } = await validate();

          if (client) {
            setClient(client);
            setChips(chips);
          }
        } catch (error) {
          console.error(error);
          setValidationError(true);
        } finally {
          setValidating(false);
        }
      };

      handleValidate();
    }
  }, [validate, setClient, setChips]);

  useEffect(() => {
    if (client && screen !== "chatsino") {
      setScreen("chatsino");
    }
  }, [client, screen]);

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
          {!client && (
            <>
              {screen === "signin" && <Signin />}
              {screen === "signup" && <Signup />}
            </>
          )}
          {screen === "chatsino" && <Chatsino />}
          {screen === "error" && <span>Error</span>}
        </>
      )}
    </section>
  );
}

export function App() {
  return (
    <ClientProvider>
      <SocketProvider>
        <Inner />
      </SocketProvider>
    </ClientProvider>
  );
}
