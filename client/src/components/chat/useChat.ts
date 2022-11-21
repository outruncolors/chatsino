import { useSocket } from "hooks";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ChatMessage {
  from: number;
  content: string;
  sentTo: string[];
  createdAt: number;
  createdBy: number;
  updatedAt: number;
}

export enum ChatSocketMessages {
  // Incoming
  SendChatMessage = "sendChatMessage",
  ListChatrooms = "listChatrooms",
  ListChatroomMessages = "listChatroomMessages",

  // Outgoing
  NewChatMessage = "newChatMessage",
}

export const CHAT_SUBSCRIBER_NAME = "chat";

export const DEFAULT_CHATROOM_ID = "Lobby";

export function useChat(chatroomId = DEFAULT_CHATROOM_ID) {
  const { makeRequest, subscribe, unsubscribe } = useSocket();
  const [chatroom, setChatroom] = useState(null);
  const [chatroomMessages, setChatroomMessages] = useState<ChatMessage[]>();
  const [error, setError] = useState("");

  // Effect: Changing chatrooms should clear messages and refetch.
  useEffect(() => {
    setChatroomMessages([]);
  }, [chatroomId]);

  // Effect: Add new messages as they come in.
  useEffect(() => {
    subscribe(
      CHAT_SUBSCRIBER_NAME,
      ChatSocketMessages.NewChatMessage,
      ({ data, error }) => {
        if (error) {
          setError(error);
        } else if (data) {
          const { messages } = data as { messages: ChatMessage[] };
          setChatroomMessages((prev) => (prev ?? []).concat(messages));
        }
      }
    );

    return () => {
      unsubscribe(CHAT_SUBSCRIBER_NAME, ChatSocketMessages.NewChatMessage);
    };
  }, [subscribe, unsubscribe]);

  const sendChatMessage = useCallback(
    (message: string) => {
      if (message.length > 0) {
        makeRequest(ChatSocketMessages.SendChatMessage, {
          message,
          room: DEFAULT_CHATROOM_ID,
        });
      }
    },
    [makeRequest]
  );

  return useMemo(
    () => ({
      chatroom,
      chatroomMessages,
      error,
      sendChatMessage,
    }),
    [chatroom, chatroomMessages, error, sendChatMessage]
  );
}
