import { useEffect, useRef } from "react";

const SERVER_ADDRESS = "wss://localhost:8080";

function useSocket() {
  const socket = useRef<null | WebSocket>(null);

  useEffect(() => {
    if (!socket.current) {
      socket.current = new WebSocket(SERVER_ADDRESS);

      socket.current.onopen = function handleSocketOpen(event) {
        console.log("Opened connection.", event);
      };

      socket.current.onclose = function handleSocketClose(event) {
        console.log("Closed connection.", event);
      };

      socket.current.onerror = function handleSocketError(event) {
        console.log("Encountered error.", event);
      };

      socket.current.onmessage = function handleSocketMessage(event) {
        console.log("Received message.", event);
      };
    }
  });

  return socket.current;
}

export function App() {
  useSocket();

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
