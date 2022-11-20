import { useSocket } from "hooks";
import { ChangeEvent, FormEvent, useCallback, useState } from "react";

export function Chat() {
  const [message, setMessage] = useState("");
  const { makeRequest } = useSocket();
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  }, []);
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (message) {
        makeRequest("sendChatMessage", {
          message,
          room: "Lobby",
        });

        setMessage("");
      }
    },
    [message, makeRequest]
  );

  return (
    <div>
      <h1>Chat</h1>
      <hr />
      <form onSubmit={handleSubmit}>
        <input type="text" value={message} onChange={handleChange} />
        <button>Send</button>
      </form>
    </div>
  );
}
