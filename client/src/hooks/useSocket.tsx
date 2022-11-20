import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import * as config from "config";
import { useAuthentication } from "./useAuthentication";
import { useClient } from "./useClient";

type Response = {
  data?: unknown;
  error?: string;
};

type SubscriberData = Record<string, (response: Response) => unknown>; // Message Kind -> Message Handler

type SubscriberLookup = Record<string, SubscriberData>; // Subscriber Name -> Subscriber Data

export interface SocketContextType {
  socket: null | WebSocket;
  initialized: boolean;
  initialize: () => void;
  makeRequest: (kind: string, args: Record<string, unknown>) => void;
  subscribe: (
    name: string,
    kind: string,
    onResponse: (response: Response) => unknown
  ) => unknown;
  unsubscribe: (name: string, kind?: string) => unknown;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  initialized: false,
  initialize() {},
  makeRequest() {},
  subscribe() {},
  unsubscribe() {},
});

export function SocketProvider({ children }: PropsWithChildren) {
  const { requestTicket } = useAuthentication();
  const { client } = useClient();
  const socket = useRef<null | WebSocket>(null);
  const [initialized, setInitialized] = useState(false);
  const attemptingToReconnect = useRef<null | NodeJS.Timeout>(null);
  const subscriberLookup = useRef<SubscriberLookup>({});

  const initialize = useCallback(async () => {
    try {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }

      const ticket = await requestTicket();
      const url = new URL(config.SOCKET_SERVER_ADDRESS);

      url.search = new URLSearchParams({
        ticket,
      }).toString();

      socket.current = new WebSocket(url);

      socket.current.onopen = function handleSocketOpen(event) {
        console.info("Opened connection.", event);

        if (attemptingToReconnect.current) {
          clearInterval(attemptingToReconnect.current);
        }

        setInitialized(true);
      };

      socket.current.onclose = function handleSocketClose(event) {
        console.info("Closed connection.", event);

        attemptingToReconnect.current = setInterval(
          initialize,
          config.SOCKET_RECONNECT_ATTEMPT_RATE
        );
      };

      socket.current.onerror = function handleSocketError(event) {
        console.error("Encountered error.", event);
      };

      socket.current.onmessage = function handleSocketMessage(event) {
        console.info("Received message.", event);

        const { kind, data, error } = JSON.parse(event.data);

        for (const subscriberData of Object.values(subscriberLookup.current)) {
          subscriberData[kind]?.({ data, error });
        }
      };
    } catch (error) {
      console.error("Unable to connect -- retrying soon.", error);
    }
  }, [requestTicket]);

  const makeRequest = useCallback(
    (kind: string, args: Record<string, unknown> = {}) => {
      if (client) {
        const request = {
          kind,
          args,
        };

        socket.current?.send(JSON.stringify(request));
      }
    },
    [client]
  );

  const subscribe = useCallback(
    (
      name: string,
      kind: string,
      onResponse: (response: Response) => unknown
    ) => {
      if (!subscriberLookup.current[name]) {
        subscriberLookup.current[name] = {};
      }

      subscriberLookup.current[name][kind] = onResponse;
    },
    []
  );

  const unsubscribe = useCallback((name: string, kind?: string) => {
    if (kind) {
      if (subscriberLookup.current[name]) {
        delete subscriberLookup.current[name][kind];
      }
    } else {
      delete subscriberLookup.current[name];
    }
  }, []);

  const value = useMemo(
    () => ({
      socket: socket.current,
      initialized,
      initialize,
      makeRequest,
      subscribe,
      unsubscribe,
    }),
    [initialized, initialize, makeRequest, subscribe, unsubscribe]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
