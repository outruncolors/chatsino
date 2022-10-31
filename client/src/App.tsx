import { useEffect, useRef } from "react";
import { useAuthentication, useSocket } from "./hooks";

export function App() {
  const { signin } = useAuthentication();
  const { initialize } = useSocket();
  const signedIn = useRef(false);

  useEffect(() => {
    if (!signedIn.current) {
      signedIn.current = true;

      const handleSignin = async () => {
        await signin("user6", "password");
        initialize();
      };

      handleSignin();
    }
  }, [signin, initialize]);

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}
