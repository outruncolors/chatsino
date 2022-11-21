import { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { useChat } from "./useChat";

export function Chat() {
  const [messageDraft, setMessageDraft] = useState("");
  const { sendChatMessage } = useChat();
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMessageDraft(event.target.value);
  }, []);
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (messageDraft) {
        sendChatMessage(messageDraft);
        setMessageDraft("");
      }
    },
    [messageDraft, sendChatMessage]
  );

  return (
    <div>
      <h1>Chat</h1>
      <hr />
      <form onSubmit={handleSubmit}>
        <input type="text" value={messageDraft} onChange={handleChange} />
        <button>Send</button>
      </form>
    </div>
  );
}
